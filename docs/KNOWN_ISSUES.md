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
- **Stale architecture docs.** `replit.md` says "PostgreSQL + Drizzle"; real DB is
  **MongoDB Atlas** (`db/connection.ts`). `lib/db` (Drizzle/pg) is unused
  scaffold. → fix `replit.md` or delete the dead `lib/db` to stop confusion.

## P1 — high

- **Multiple auth/register route variants:** `auth.ts`, `auth-simple.ts`,
  `user-auth.ts`, `register.ts`. Risk of inconsistent token/ID handling across
  them. → confirm which is canonical; delete the rest.
- **RAG may be silently off.** Vector search needs `VECTOR_SEARCH_ENABLED`,
  `VECTOR_INDEX_NAME`, `VECTOR_COLLECTION`, and an embeddings key
  (`EMBEDDINGS_*`) — none set in `.env.local`. AI insights then run without
  precedent retrieval. → confirm intended behavior.
- **No env validation at boot.** Missing keys surface as runtime failures, not
  startup errors. → add a Zod env check on boot (you already use Zod).

## P2 — medium

- **Chat is polling-based**, not realtime (`useChatMessages`). Fine for low load;
  consider websockets later.
- **In-app notifications** unconfirmed — may be missing.
- **Counselling backend** unconfirmed — frontend pages exist on all 3 surfaces.
- **Loose typing in LLM layer** (`any` on fetch responses in `llm-provider.ts`).
  Acceptable for external JSON, but validate critical fields.
- **Root clutter:** several status markdowns (`IMPLEMENTATION_REPORT.md`,
  `VERIFICATION_COMPLETE.md`, etc.) + `structure.txt` (1MB) + loose scripts
  (`add-user-profile.js`, `body.json`) at repo root. → move to `docs/` or delete.

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
