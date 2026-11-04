---
noteId: "c6e46270748311f1830b0bce8ea744b0"
tags: []

---

# Known Issues & Technical Debt — Intikhab-e-Zauj

> Derived from code inspection. Priorities are suggestions; reprioritize for your
> deadline. Confirm each by testing — some are "smells", not proven bugs.

## P0 — blocks production / misleading

- **Unconfigured paid integrations.** `payment.ts` (JazzCash), `utils/sms.ts`,
  `utils/email.ts` reference `JAZZCASH_*`, `SMS_*`, `EMAIL_USER/PASSWORD` env vars
  that are **not set** in `.env.local`. Payment, SMS, and email will fail or
  no-op in production until configured. → set + test before launch.
- ~~Stale architecture docs~~ — **fixed.** `lib/db` (unused Drizzle/pg scaffold)
  deleted along with its references in `tsconfig.json` and
  `api-server/package.json`'s typecheck script and dependencies. `replit.md`
  already correctly described MongoDB as the live DB.

## P1 — high

- **Multiple auth/register route variants:** `auth.ts`, `auth-simple.ts`,
  `user-auth.ts`, `register.ts`. Risk of inconsistent token/ID handling across
  them. → confirm which is canonical; delete the rest.
- ~~RAG may be silently off~~ — **confirmed intentional**, not a bug.
  `vectorSearch.ts` documents vector search as an "OFF by default... Phase 2"
  seam: `vectorSearchEnabled()` requires `VECTOR_SEARCH_ENABLED=true` + a
  configured embeddings provider, and `findSimilarByVector` returns `null`
  (never throws) when unavailable, so the caller falls back to categorical
  retrieval. AI insights run fine without it; vector search is a future
  upgrade, not a missing requirement.
- ~~No env validation at boot~~ — **already done.** `loadEnv.ts` (imported
  first in `index.ts`) fails fast with a clear message if `DATABASE_URL` or
  `JWT_SECRET` is missing, and warns at boot which optional integrations
  (email, Safepay, Cloudinary, SMS, LLM) are inactive. Plain checks rather
  than a Zod schema, but solves the actual problem — missing keys are now a
  startup-time warning, not a deep runtime crash.

## P2 — medium

- **Chat is polling-based**, not realtime (`useChatMessages`). Fine for low load;
  consider websockets later.
- **In-app notifications** unconfirmed — may be missing.
- **Counselling backend** unconfirmed — frontend pages exist on all 3 surfaces.
- **Loose typing in LLM layer** (`any` on fetch responses in `llm-provider.ts`).
  Acceptable for external JSON, but validate critical fields.
- ~~Root clutter~~ — **fixed.** Status markdowns already live in `docs/`; the
  stray `structure.txt`, `add-user-profile.js`, and `body.json` no longer exist
  at root.

## Things that are GOOD (don't "fix")

- LLM provider abstraction with graceful null-fallback — solid design.
- `minimumReleaseAge: 1440` supply-chain guard in `pnpm-workspace.yaml`.
- Pure, unit-tested matching scorer (`matching.test.ts`).
- Cost tracking on every LLM call.

## Pre-deployment checklist (condensed)

| Area | Item | Status |
|---|---|---|
| Env | DATABASE_URL, JWT_SECRET, Cloudinary | ✅ set |
| Env | GOOGLE_API_KEY (Gemini) | ✅ set |
| Env | EMAIL_*, SMS_*, JAZZCASH_* | ❌ not set |
| Env | EMBEDDINGS_* / VECTOR_* | ❌ not set |
| DB | indexes on users/proposals/matches + vector index | verify |
| DB | TTL on chat/proposal expiry vs `proposalSweeper.ts` | verify |
| Sec | passwords hashed (`utils/password.ts`) | verify cost factor |
| Sec | CORS origin locked to FRONTEND_URL | verify (currently broad?) |
| Sec | HTTPS enforced | infra |
| Test | full Register→…→Chat happy path | run it |
