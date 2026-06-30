---
noteId: "9fe57970748311f1830b0bce8ea744b0"
tags: []

---

# Architecture — Intikhab-e-Zauj (Nikah Network)

> Staff-mediated, AI-assisted Islamic matrimonial platform.
> This doc is generated from the actual code, not assumptions. Where something is
> coded but unconfigured/untested, it is flagged explicitly.

## 1. Repo shape (pnpm monorepo)

```
artifacts/                  deployable apps
  api-server/               Express 5 backend (MongoDB, native driver)
  nikah-network/            main React frontend (Vite 7)
  mockup-sandbox/           isolated UI prototyping playground
lib/                        shared internal packages
  db/                       Drizzle+pg scaffold — UNUSED by api-server (see note)
  api-spec/                 OpenAPI + Orval codegen
  api-zod/                  shared Zod schemas
  api-client-react/         generated React Query client
scripts/                    one-off task runners (tsx)
```

Shared dep versions are pinned centrally via the pnpm **catalog** in
`pnpm-workspace.yaml`. Security: `minimumReleaseAge: 1440` blocks installing any
npm package younger than 1 day (supply-chain defense).

> **DB truth:** api-server talks to **MongoDB Atlas** via the native `mongodb`
> driver (`src/db/connection.ts`, db name `intikhab_dev`). The `drizzle-orm`/`pg`
> deps and `lib/db` Drizzle scaffold are leftover template boilerplate — no
> api-server source imports them. `replit.md` claiming "PostgreSQL + Drizzle" is
> stale for this app.

## 2. Layered flow

```
┌────────────────────────────────────────────────────────────────┐
│ FRONTEND  (React 19 + TS + Vite 7 + Tailwind 4 + Radix UI)      │
│                                                                  │
│  Pages (wouter routing)                                          │
│   pages/marketing/*   public site (home, pricing, how-it-works) │
│   pages/app/*         applicant area (matches, proposals, chat) │
│   pages/staff/*       staff area (approval, review, audit, cfg)  │
│         ↓                                                        │
│  State: Zustand store (src/lib/store.ts) + AuthContext          │
│         ↓                                                        │
│  Data fetching: TanStack Query hooks (hooks/useMatches, etc.)   │
│  Service layer:  services/matchingService, proposalService,     │
│                  deduplicationService                           │
└────────────────────────────────────────────────────────────────┘
                    ↓ HTTP/REST (JWT in header/cookie)
┌────────────────────────────────────────────────────────────────┐
│ BACKEND  (Express 5, ESM, bundled by esbuild → dist/index.mjs)  │
│                                                                  │
│  Routes (mounted under /api in src/index.ts)                    │
│   auth, user-auth, auth-simple, register, profiles,             │
│   profile-completion, matchingRoutes, proposalRoutes            │
│   (user+staff), payment, staffRoutes, cloudinaryRoutes,         │
│   auditLogsRoutes, seed-data, health                            │
│         ↓                                                        │
│  Middleware: middleware/auth.ts (JWT verify)                    │
│         ↓                                                        │
│  Business logic (src/lib/)                                       │
│   matching/applyHardFilters.ts   gender/age/etc. gate           │
│   matching/calculateScore.ts     100-pt weighted scorer         │
│   ragRetrieval.ts + vectorSearch.ts + embeddings.ts  RAG        │
│   llmInsights.ts + insights.ts + llm-provider.ts     AI         │
│   cost-tracker.ts                LLM spend logging              │
│   notifications.ts               email/SMS dispatch             │
│   proposalSweeper.ts             expiry cron sweeper            │
│   seedGenerator.ts               fake data generation          │
│         ↓                                                        │
│  Data access (src/db/, native mongodb driver)                   │
│   connection.ts, matches-schema, messages-schema,               │
│   proposals-schema, staff, auditLogs, seed                      │
└────────────────────────────────────────────────────────────────┘
                    ↓ mongodb driver
┌────────────────────────────────────────────────────────────────┐
│ MongoDB Atlas — db: intikhab_dev                                │
│  collections: users/profiles, proposals, messages, matches,     │
│               staff, auditLog (+ vector collection for RAG)     │
└────────────────────────────────────────────────────────────────┘

External services (called from backend):
  Cloudinary        photo upload/host   (CONFIGURED in .env.local)
  Gemini  API       AI insights          (CONFIGURED — GOOGLE_API_KEY set)
  Anthropic Claude  AI insights          (supported, NOT configured)
  OpenAI/DeepSeek   AI insights          (supported, NOT configured)
  Gmail SMTP        email notifications  (CODED, EMAIL_USER/PASSWORD not set)
  SMS gateway       SMS notifications    (CODED, SMS_* env not set)
  JazzCash          payment              (CODED, JAZZCASH_* env not set)
```

## 3. The matching pipeline (core IP)

1. **Hard filters** (`matching/applyHardFilters.ts`) — eliminate impossible
   candidates (gender, age band, etc.). Pass/fail gate.
2. **Weighted score** (`matching/calculateScore.ts`) — pure function, 0–100:
   `Caste 25 · Profession 15 · AgeGap 15 · City 15 · Height 10 · HouseStatus 10 · HouseArea 10`.
   Missing data → neutral partial credit (never 0). City scoring groups
   metro areas (e.g. Islamabad/Rawalpindi count as same group).
3. **RAG retrieval** (`ragRetrieval.ts`) — find similar past pairs by
   **categorical match** (same profession bucket + same city group) over the
   `proposals` collection, labelled with their real outcome (married/rejected/…).
   NOTE: this wired path is rule-based, NOT vector search. `vectorSearch.ts` +
   `embeddings.ts` exist as an optional capability but `ragRetrieval` does not
   call them.
4. **LLM insight** (`llmInsights.ts` → `llm-provider.ts`) — feed score +
   retrieved precedents to an LLM, get an APPROVE/REVIEW/CAUTION style
   recommendation for staff. Falls back to template text if no LLM key.

## 4. LLM provider abstraction (`src/lib/llm-provider.ts`)

One interface, 4 swappable providers (claude/gemini/openai/deepseek) selected by
`PREFERRED_LLM` env (or `auto` = first key present, cost-then-quality order
gemini→claude→openai→deepseek). `callLLM()` never throws — returns `null` when no
key, so AI is a graceful enhancement, not a hard dependency. Every call records
token cost via `cost-tracker.ts`.

> **Active provider today: Gemini** (`gemini-2.5-flash`), because only
> `GOOGLE_API_KEY` is set. To switch to Claude, add `ANTHROPIC_API_KEY` and set
> `PREFERRED_LLM=claude` (default Claude model `claude-haiku-4-5`).

## 5. Build & run

| Command | Effect |
|---|---|
| `pnpm dev` | `dev.mjs` orchestrates all apps |
| `pnpm build` | `build-all.mjs` — typecheck + build everything |
| `pnpm --filter @workspace/api-server run dev` | backend only |
| `pnpm --filter @workspace/api-server run test` | Vitest (matching + sms tests exist) |
| `pnpm --filter @workspace/api-spec run codegen` | OpenAPI → Orval → typed hooks |
| `pnpm typecheck` | full workspace typecheck |

Backend builds with **esbuild** to a single `dist/index.mjs`, run with
`node --enable-source-maps`.
