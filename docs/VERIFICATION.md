---
noteId: "17d36b80748511f1830b0bce8ea744b0"
tags: []

---

# Verification record — 2026-06-30

What was actually run on this machine, and the result. Honest scope: build + boot
+ unit tests verified; live end-to-end blocked by DB connectivity here.

| Check | Command | Result |
|---|---|---|
| Backend build | `pnpm --filter @workspace/api-server build` | ✅ exit 0 — `dist/index.mjs` 1.3mb (esbuild) |
| Backend boot | `node dist/index.mjs` | ⚠️ starts, loads env (7 from `.env`, 8 from `.env.local`), then **fail-fasts** |
| MongoDB connect | (on boot) | ❌ `querySrv ECONNREFUSED _mongodb._tcp.cluster0.8avsmql.mongodb.net` |
| Unit tests | `pnpm --filter @workspace/api-server test` | ✅ **23 passed / 2 files** (matching scorer + sms) |

## Why live e2e is blocked here

The server **intentionally exits if MongoDB is unreachable** (`db/connection.ts`
throws, `index.ts` aborts). From this sandbox the Atlas SRV record can't be
resolved (`ECONNREFUSED`). Causes, in order of likelihood:

1. No outbound network/DNS to MongoDB Atlas from this environment.
2. Atlas cluster paused (free tier auto-pauses).
3. Current IP not in the Atlas IP allowlist.

This is an **environment/network condition, not a code bug**. On a machine with
network access + allowlisted IP + running cluster, the server boots and the
happy path can be exercised.

## To run the full happy path yourself

1. Confirm Atlas cluster is running and your IP is allowlisted.
2. `pnpm --filter @workspace/api-server dev` (build + start) — watch for
   `✓ Connected to MongoDB Atlas`.
3. Health check: `GET http://localhost:<port>/api/healthz` → expect
   `{ status:"ok", database:"connected" }`.
4. `pnpm --filter @workspace/nikah-network dev` for the UI.
5. Walk: register → verify → profile → match → send proposal → staff approve →
   recipient accept → chat → interested → conclude.
6. Note: payment (JazzCash), email, SMS are **unconfigured** — those steps no-op
   until their env vars are set (see KNOWN_ISSUES).

## Deploy note discovered during verification

Server has **no DB retry/backoff** — it crashes on first failed connect. In
production behind a process manager it will restart-loop if the DB blips. Consider
a retry or readiness gate.
