# Phase 2 — AI Insights (LLM summary + Atlas Vector Search)

Both features are **OFF by default**. With no env set, the AI Insights endpoint
returns the deterministic v0 template (bullets + recommendation + categorical
similar-match stats) and **nothing leaves the server**. Each feature turns on
independently via env; failures fall back to v0 and never break the request.

Endpoint: `GET /api/staff/matches/:matchId/insights`
Response: `{ success, matchId, score, insights, aiSummary, retrieval }`
- `aiSummary`: string when LLM enabled, else `null`
- `retrieval`: `'vector'` when Atlas vector search served the similar-match
  stats, else `'categorical'`

---

## 1. LLM prose summary (provider-agnostic)

Condenses the v0 insight bullets into a 2–3 sentence staff recommendation, and
powers the RAG `APPROVE/REVIEW/CAUTION` recommendation. **Swap providers via env
— no code changes.** Abstraction: [`src/lib/llm-provider.ts`](../src/lib/llm-provider.ts).

**Selection**
```
PREFERRED_LLM=auto    # auto | claude | gemini | openai | deepseek
```
`auto` (default) picks the first provider whose key is present, in cost-then-
quality order: **gemini → claude → openai → deepseek**. With no key set,
`aiSummary: null` and the UI shows template bullets only.

**Keys (set the one you use)**
```
GOOGLE_API_KEY=AIza...        # Gemini  (free tier — best for testing)
ANTHROPIC_API_KEY=sk-ant-...  # Claude  (best quality, no free tier)
OPENAI_API_KEY=sk-proj-...    # GPT-4o-mini
DEEPSEEK_API_KEY=...          # DeepSeek (cheapest, lower quality)
```
**Per-provider model override (optional):** `CLAUDE_MODEL` / `GEMINI_MODEL` /
`OPENAI_MODEL` / `DEEPSEEK_MODEL`. Defaults: `claude-haiku-4-5`,
`gemini-2.5-flash`, `gpt-4o-mini`, `deepseek-chat`.

> *Gemini free-tier quota is per Google Cloud project. Some projects show
> `limit: 0` for `gemini-2.0-flash` (429 RESOURCE_EXHAUSTED) while
> `gemini-2.5-flash` works — hence the 2.5 default. If you hit 429s, either
> enable billing on the project or set `GEMINI_MODEL` to a model with quota.

| Provider | Default model | Free tier | Rel. quality | ~Cost/insight |
|---|---|---|---|---|
| Gemini | gemini-2.5-flash | 1M tok/mo free* | good | ~$0.0002 |
| Claude | claude-haiku-4-5 | none | best (Haiku tier) | ~$0.0008 |
| OpenAI | gpt-4o-mini | $5 trial credit | good | ~$0.0005 |
| DeepSeek | deepseek-chat | none | lower | ~$0.00002 |

**Migration:** start on Gemini free for dev → flip `PREFERRED_LLM=claude` (or
just add the key) in prod. No redeploy of code, only env.

**Usage gauge:** `GET /api/staff/matches/insights/cost-stats` returns in-memory
token/cost totals by provider (resets on restart). Tracker:
[`src/lib/cost-tracker.ts`](../src/lib/cost-tracker.ts).

**⚠ Privacy:** prompts include profession/city/age and may include names. Enabling
sends that text to the configured provider (third party). Only enable if
acceptable. Cost: well under $2/mo at staff scale. Latency: ~1–3 s/insight.

---

## 2. Atlas Vector Search (semantic similar-match retrieval)

Replaces the categorical (profession-bucket × city-group) similar-match lookup
with semantic vector retrieval over historical pairs.

### Requirements
1. **MongoDB Atlas** (vector search is Atlas-only; not self-hosted Mongo).
2. An **embeddings provider** (Voyage or OpenAI) — another API key.
3. A populated **`match_vectors`** collection + a vector index.
4. `VECTOR_SEARCH_ENABLED=true`.

If any piece is missing, retrieval falls back to categorical automatically.

### Env
```
VECTOR_SEARCH_ENABLED=true
EMBEDDINGS_PROVIDER=voyage          # or: openai
EMBEDDINGS_API_KEY=...
EMBEDDINGS_MODEL=voyage-3           # optional; voyage-3 (1024d) / text-embedding-3-small (1536d)
VECTOR_INDEX_NAME=match_vector_index   # optional
VECTOR_COLLECTION=match_vectors        # optional
```

### `match_vectors` document shape
Populated by an offline job that embeds each historical pair and records its
outcome (a `completed` proposal = `success`).
```json
{
  "pairKey": "<sortedProfileIdA>|<sortedProfileIdB>",
  "embedding": [/* number[] */],
  "outcome": "success"   // 'success' | 'pending' | 'other'
}
```
Embed text is built by `pairToText(male, female)` in
[`src/lib/embeddings.ts`](../src/lib/embeddings.ts) — descriptive traits only
(profession, education, city, caste, age), **no IDs/names**.

### Atlas vector index (`match_vector_index` on `match_vectors`)
`numDimensions` MUST match the embedding model
(voyage-3 = 1024, openai text-embedding-3-small = 1536).
```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" }
  ]
}
```

### Backfill job (to build later)
For each historical pair (e.g. every proposal, or every approved match):
1. load both profiles → `pairToText(male, female)`
2. `embed(text)` → vector
3. derive `outcome` (`completed` → `success`; `approved`/`pending_*` → `pending`; else `other`)
4. upsert `{ pairKey, embedding, outcome }` into `match_vectors`

Code seam: [`src/lib/vectorSearch.ts`](../src/lib/vectorSearch.ts)
(`findSimilarByVector`).

---

## Roll-out order
1. Ship v0 (done) — zero config.
2. Turn on LLM summary (1 key) once privacy is signed off.
3. Stand up embeddings + Atlas index, write the backfill job, then flip
   `VECTOR_SEARCH_ENABLED=true`.
