---
noteId: "b031fd80748311f1830b0bce8ea744b0"
tags: []

---

# Feature Checklist — Intikhab-e-Zauj

> Status reflects **code existence + wiring**, verified from source.
> ✅ = code present and wired · ⚠️ = coded but unconfigured / partial / unverified
> end-to-end · ❌ = missing. "Code exists" is NOT the same as "tested working" —
> items marked ⚠️ need a real end-to-end run to confirm.

## Core features

| Feature | UI | Backend | DB | Notes |
|---|----|---------|----|-------|
| Registration | ✅ `register.tsx`, `quick-register.tsx` | ✅ `register.ts`, `user-auth.ts` | ✅ users | multiple register/auth route variants exist — see Known Issues |
| Email verification | ✅ `verify-email.tsx`, `verify-auto.tsx` | ✅ auth routes | ✅ | email send depends on Gmail SMTP (⚠️ unconfigured) |
| Login / JWT auth | ✅ `user-login.tsx`, `AuthContext` | ✅ `auth.ts`, `user-auth.ts`, `middleware/auth.ts` | ✅ | JWT_SECRET set |
| Profile wizard | ✅ `profile-wizard.tsx` | ✅ `profiles.ts`, `profile-completion.ts` | ✅ | multi-step, completion % tracked |
| Photo upload | ✅ `CloudinaryUpload.tsx`, `useCloudinaryUpload` | ✅ `cloudinaryRoutes.ts` | ✅ (Cloudinary) | **configured** |
| Face detection | ✅ frontend face-api models | n/a | n/a | see `FACE_DETECTION_FIX_SUMMARY.md` |
| Payment / subscription | ✅ `payment.tsx` | ⚠️ `payment.ts` (JazzCash) | ✅ | JAZZCASH_* env NOT set → unconfigured |
| Hard filters | ✅ `HardFilterDebugger.tsx` | ✅ `matching/applyHardFilters.ts` | ✅ | unit-tested (`matching.test.ts`) |
| Weighted scoring | ✅ `ScoreBreakdownUI.tsx`, `CompatibilityRing.tsx` | ✅ `matching/calculateScore.ts` | ✅ | 100-pt, pure fn, tested |
| Match generation | ✅ `pages/app/matches.tsx`, `useMatches` | ✅ `matchingRoutes.ts` | ✅ matches | |
| RAG (similar matches) | — | ✅ `ragRetrieval.ts` (categorical: profession+city over proposals) | ✅ proposals | works with no extra config; `vectorSearch.ts`/`embeddings.ts` = optional unused capability |
| AI insights | ✅ `matches/InsightsModal.tsx` | ✅ `llmInsights.ts`, `insights.ts`, `llm-provider.ts` | — | active provider = Gemini; falls back to template w/o key |
| LLM cost tracking | — | ✅ `cost-tracker.ts` | — | logs token spend per call |
| Proposals (send/accept/decline) | ✅ `ProposalModal.tsx`, `proposals.tsx`, `proposal-detail.tsx`, `useProposal` | ✅ `proposalRoutes.ts` (user+staff routers) | ✅ proposals | Q&A in `lib/qnaQuestions.ts` |
| Staff proposal review | ✅ `staff/proposals.tsx` | ✅ staff proposal router | ✅ | |
| Proposal expiry sweep | — | ✅ `proposalSweeper.ts` | ✅ | background sweeper |
| Chat (time-boxed) | ✅ `StaffChatModal.tsx`, `useChatMessages`, `useProposalTimer` | ✅ messages schema | ✅ messages | polling-based, not realtime |
| Notifications — email | — | ⚠️ `notifications.ts`, `utils/email.ts` | — | EMAIL_USER/PASSWORD not set |
| Notifications — SMS | — | ⚠️ `utils/sms.ts` (+ `sms.test.ts`) | — | SMS_* env not set |
| Notifications — in-app | ❓ | ❓ | — | not confirmed; verify |
| Staff dashboard | ✅ `staff/dashboard.tsx` | ✅ `staffRoutes.ts` | ✅ staff | |
| Profile approval | ✅ `staff/profile-approval.tsx`, `profile-detail.tsx` | ✅ | ✅ | |
| Staff data entry | ✅ `staff/data-entry.tsx` | ✅ | ✅ | staff can create profiles |
| Admin panel / config | ✅ `staff/admin-panel.tsx`, `config.tsx`, `setup.tsx` | ⚠️ | ✅ | verify config persistence |
| Audit log | ✅ `staff/audit.tsx` | ✅ `auditLogsRoutes.ts` | ✅ auditLog | |
| Counselling | ✅ `app/counselling.tsx`, `staff/counselling.tsx`, marketing | ❓ | ❓ | verify backend |
| Deduplication | ✅ `deduplicationService.ts`, `lib/duplicate.ts` | ✅ | ✅ | |
| Seed/demo data | ✅ `DemoSwitcher.tsx` | ✅ `seed-data.ts`, `seedGenerator.ts` | ✅ | dev convenience |

## Verification still needed (do an end-to-end run)

- Full happy path: Register → verify → profile → (payment) → match → propose →
  staff approve → chat → outcome.
- Whether payment/SMS/email actually fire (currently unconfigured env).
- Whether RAG vector search is enabled and returns results.
- In-app notifications + counselling backend existence.
