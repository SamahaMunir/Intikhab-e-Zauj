---
noteId: "b8489ba0748311f1830b0bce8ea744b0"
tags: []

---

# User Journeys — Intikhab-e-Zauj

Three audiences. Routes are `wouter` paths in `nikah-network`; backend routes are
under `/api`.

## 1. Applicant (boy/girl seeking match)

```
marketing/home → pricing → register
  → verify-email (email link / OTP)
  → profile-wizard (multi-step: personal, family, preferences, photo)
      • photo via Cloudinary; completion % tracked
  → payment (subscription — JazzCash, currently unconfigured)
  → wait for staff approval
  → app/matches  (card UI, score badge, compatibility ring)
      • view match-detail, filter (FilterPanel)
  → send proposal (ProposalModal → Q&A from lib/qnaQuestions.ts)
  → STAFF PRE-SCREEN FIRST (status pending_staff_review; recipient cannot see it)
  → staff approve → pending_recipient (now visible to recipient)
  → recipient accepts → chat_active, 48h window opens (useProposalTimer)
  → both click "interested" → family_proposal_stage (chat closes, families notified)
  → staff conclude → completed | not_proceeded → outcome
```
Key files: `pages/app/*`, `components/matches/*`, `hooks/useMatches`,
`useProposal`, `useChatMessages`, `services/proposalService`.

## 2. Staff (center staff / matchmaker)

```
marketing/staff-login → staff/dashboard (queues + counts)
  → profile-approval queue → profile-detail → approve / reject(+reason)
  → staff/matches → view generated matches
      • InsightsModal: RAG similar matches + LLM recommendation
      • CreateMatchModal: hand-craft a match for shy families
  → staff/proposals → PRE-SCREEN pending_staff_review proposals → approve / reject
      • approve → pending_recipient (recipient now sees + accepts → chat opens)
      • reject → rejected_by_staff (only initiator told; recipient never saw it)
      • later: conclude family-stage proposals → completed / not_proceeded
  → staff/messages → monitor active chats (StaffChatModal)
  → staff/audit → action history
  → staff/data-entry → create profiles on behalf of walk-in families
  → staff/config + admin-panel + setup → tune system
```
Key files: `pages/staff/*`, `proposalRoutes.ts` (staffProposalRouter),
`staffRoutes.ts`, `llmInsights.ts`, `ragRetrieval.ts`.

## 3. Admin (project owner)

Overlaps staff via `staff/admin-panel.tsx`, `config.tsx`, `setup.tsx`:
- configure matching/subscription/Q&A/chat-duration
- view analytics (⚠️ verify how complete)
- audit log review/export

## Decision points worth knowing

| Where | Decision | Outcome |
|---|---|---|
| Staff profile approval | approve/reject | reject → profile not matchable, reason returned |
| Staff proposal pre-screen | approve/reject | reject → ends (recipient never saw it); approve → recipient sees it |
| Recipient on proposal | accept/decline | decline → ends; accept → chat opens (48h) |
| Both sides after chat | interested | both interested → family_proposal_stage |
| Chat timer | both interested / expire | expire → proposal auto-closed by `proposalSweeper.ts` |
| No LLM key | — | insights fall back to template text (no crash) |
