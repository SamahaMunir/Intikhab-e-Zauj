# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB Atlas (native `mongodb` driver; db `intikhab_dev`). NOTE: `lib/db` (Drizzle + pg) is template scaffold still referenced by the typecheck build chain but NOT used by api-server at runtime.
- **Validation**: Zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (single ESM bundle → `dist/index.mjs`)
- **AI**: pluggable LLM provider (claude/gemini/openai/deepseek) for staff decision-support only (APPROVE/REVIEW/CAUTION). RAG = categorical retrieval of similar past matches (not vector search). Scoring/matching are pure rules, no AI.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/api-server run test` — run backend unit tests (Vitest)

> MongoDB collections are created/indexed automatically on server boot
> (`initProposalsCollection`, `initMatchesCollection`, … in `src/db/`). There is
> no migration step for the live DB. The `@workspace/db` `drizzle-kit push`
> command targets the UNUSED Drizzle/pg scaffold — ignore it for this app.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
