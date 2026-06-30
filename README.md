# Intikhab-e-Zauj (Nikah Network)

A **staff-mediated, AI-assisted Islamic matrimonial platform**. Families get
vetted, explainable introductions with staff oversight — not anonymous swipes.

## What it does

- Applicants register, build a profile, and get **rule-based compatibility
  matches** (transparent 100-point score — no black-box ML).
- Staff **pre-screen every proposal** before the other side sees it, then guide a
  time-boxed (48h) chat toward an offline family meeting.
- An optional **AI layer advises staff** (APPROVE / REVIEW / CAUTION) using
  similar past matches as grounding. AI never picks or scores matches.

## Tech stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces + TypeScript 5.9 |
| Frontend | React 19, Vite 7, Tailwind 4, Radix UI, TanStack Query, Zustand, wouter |
| Backend | Express 5 (ESM, bundled by esbuild) |
| Database | **MongoDB Atlas** (native driver, db `intikhab_dev`) |
| AI | Pluggable LLM (Claude / Gemini / OpenAI / DeepSeek) — staff insights only |
| Media | Cloudinary |

> Note: `lib/db` (Drizzle + pg) is leftover template scaffold — **not** the live
> database. The app uses MongoDB.

## Quick start

```bash
pnpm install
# set DATABASE_URL + JWT_SECRET in artifacts/api-server/.env.local
pnpm --filter @workspace/api-server run dev   # backend (build + start)
pnpm --filter @workspace/nikah-network run dev # frontend
```

Backend boots only when MongoDB is reachable. Health check:
`GET /api/healthz` → `{ status: "ok", database: "connected" }`.

## Documentation

Full docs live in [`docs/`](docs/):

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, matching pipeline, AI layer
- [USER_JOURNEYS.md](docs/USER_JOURNEYS.md) — applicant / staff / admin flows
- [FEATURE_CHECKLIST.md](docs/FEATURE_CHECKLIST.md) — what's complete vs partial
- [TRACE_send_proposal.md](docs/TRACE_send_proposal.md) — one feature traced file-by-file
- [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — tech debt + pre-deploy checklist
- [VERIFICATION.md](docs/VERIFICATION.md) — what's been build/test-verified

## Key commands

```bash
pnpm run typecheck                              # typecheck all packages
pnpm run build                                  # build everything
pnpm --filter @workspace/api-server run test    # backend unit tests (Vitest)
pnpm --filter @workspace/api-spec run codegen   # OpenAPI → typed hooks + Zod
```
