---
noteId: "0f561c50748511f1830b0bce8ea744b0"
tags: []

---

# Code Trace — "Send Proposal" (Level 5)

Every file/function that runs from the applicant clicking **Send Proposal** to the
proposal saved + staff notified. Line numbers are at time of writing.

## Happy path: applicant → staff queue

```
1. CLICK — applicant on matches page
   pages/app/matches.tsx   → opens <ProposalModal mode="user" />

2. MODAL — collect message + optional Q&A
   components/matches/ProposalModal.tsx
     • multi-step: intro(message) → Q&A categories → review   (lines 141–224)
     • Q&A bank: lib/qnaQuestions.ts
     • doSubmit() builds ProposalPayload, calls onSubmit()    (line 113)

3. HOOK — fire the create + toast
   hooks/useProposal.ts → useCreateProposal.create()          (line 68)
     → proposalService.create(input)

4. SERVICE — HTTP request
   services/proposalService.ts → create()                     (line 119)
     POST {VITE_API_URL}/api/proposals
     headers: Authorization: Bearer <token from lib/auth getToken()>
     body: { type:'USER_PROPOSAL', recipientId, message, matchNotes,
             compatibilityReason, questionResponses? }

   ── network boundary ──

5. ROUTE — backend entry
   src/index.ts mounts userProposalRouter at /api/proposals
   routes/proposalRoutes.ts → userProposalRouter.post('/')    (line 203)

6. AUTH — JWT verify
   middleware/auth.ts → authMiddleware   → req.user = { id, email, role }

7. VALIDATE (all 400/403/404/409 guards in the handler)
   • type must be USER_PROPOSAL | STAFF_PROPOSAL              (line 207)
   • STAFF_PROPOSAL requires staff/admin role                (line 214)
   • initiatorId/recipientId valid ObjectId + differ         (line 219–228)
   • both profiles exist (db.profiles.findOne)               (line 233)
   • HARD FILTERS gate: applyHardFilters(initiator,recipient)(line 255)
       lib/matching/applyHardFilters.ts  → 400 if !passes
   • DUPLICATE guard: no active proposal between the pair     (line 266)
       → 409 if one exists

8. BUILD DOC
   db/proposals-schema.ts → createProposalDocument()          (line 200)
     USER_PROPOSAL ⇒ status 'pending_staff_review'  (staff pre-screen)
     chat closed, mutualInterest all false, expiresAt = +14d

9. PERSIST
   db.collection('proposals').insertOne(doc)                  (line 302)

10. NOTIFY (never throws — see lib/notifications.ts)
    status pending_staff_review ⇒ notifyStaffNewProposal()    (line 308)
      → email/SMS to staff (currently UNCONFIGURED env → no-op)

11. AUDIT
    db/auditLogs.ts → logAudit('create_proposal', …)          (line 313)

12. RESPONSE
    201 { success, proposalId, proposal }                     (line 320)

13. FE SETTLES
    useCreateProposal → toast "Proposal sent"                 (useProposal.ts:72)
    ProposalModal → done screen "reviewed by staff before delivery" (line 270)
```

## What happens next (separate user actions, same file)

| Action | Route | Handler | Effect |
|---|---|---|---|
| Staff approve | `PATCH /api/staff/proposals/:id/review` | `staffProposalRouter` (line 755) | → `pending_recipient` (or chat/family if staff-managed side) |
| Staff reject | same | same | → `rejected_by_staff` (initiator notified, recipient never saw it) |
| Recipient accept | `PATCH /api/proposals/:id/respond` | line 394 | → `chat_active`, 48h chat opens |
| Recipient decline | same | same | → `declined_by_recipient` |
| Mark interested | `PATCH /api/proposals/:id/interest` | line 506 | both interested → `family_proposal_stage` |
| Send chat msg | `POST /api/proposals/:id/messages` | line 645 | guarded by `detectContactInfo()` — blocks phone/email/links |
| Expiry | (lazy) `settleExpiry()` line 167 + `lib/proposalSweeper.ts` | — | window elapsed → family stage or `expired` |
| Staff conclude | `PATCH /api/staff/proposals/:id/conclude` | line 856 | → `completed` / `withdrawn` |

## Fragile points on this path

- **Auth token key**: FE reads `localStorage('token')` (`lib/auth.getToken`). If any
  login flow writes a different key, every proposal call 401s. Verify all auth
  variants agree (see KNOWN_ISSUES — multiple auth routes).
- **ID type**: backend expects `initiatorId`/`recipientId` as Mongo ObjectId
  strings. A profile `id` vs `_id` mismatch → 400 "Valid …Id required".
- **Hard-filter gate**: a pair that fails returns 400 with `rejections[]` — the UI
  must surface that, not swallow it.
- **Notifications are no-ops** until `EMAIL_*`/`SMS_*` env configured — staff won't
  actually be alerted of new proposals in the current config.
