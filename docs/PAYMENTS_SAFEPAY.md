# Safepay Payments — Setup

One-time registration fee (Rs. 4000) via Safepay's **hosted Express Checkout**.
The applicant is redirected to Safepay's page, pays, and returns; we mark them
paid only after a server-side verify and/or webhook — never on the redirect alone.

This replaces the old JazzCash simulation stub.

---

## 1. Environment variables

Add to `artifacts/api-server/.env.local` (never commit real keys):

```
# Safepay — Developers → API Keys in the dashboard
SAFEPAY_SECRET_KEY=sec_xxxxxxxxxxxxxxxxxxxx     # private — server only
SAFEPAY_API_KEY=your_merchant_api_key          # public merchant key
SAFEPAY_ENV=sandbox                            # sandbox | production
SAFEPAY_HOST=https://sandbox.api.getsafepay.com

# Frontend origin — used to build redirect/cancel URLs
CLIENT_URL=http://localhost:3000
```

When you go live: `SAFEPAY_ENV=production`,
`SAFEPAY_HOST=https://api.getsafepay.com`, live keys, and set `CLIENT_URL` to
your production domain.

The server boots fine without these — payment routes just return `503` until
they're set (see the "Inactive integrations" warning on startup).

---

## 2. Flow / endpoints

| Step | Endpoint | Auth |
|------|----------|------|
| Start checkout | `POST /api/payment/create-checkout` | applicant JWT |
| Verify on return | `GET /api/payment/verify/:tracker` | applicant JWT |
| Webhook (source of truth) | `POST /api/payment/webhook` | **none** (Safepay calls it) |
| Status | `GET /api/payment/status/:userId` | JWT |

`Pay` → server creates session + hosted URL → redirect to Safepay →
pay → back to `/app/payment/success?tracker=...` → verify → `profiles.paymentStatus = 'completed'`.

Frontend pages: `/app/payment`, `/app/payment/success`, `/app/payment/cancel`.

**Paid state is written to the `profiles` collection** (`paymentStatus: 'completed'`),
which is exactly what the matching gate checks (`PAYMENT_OK = ['completed','waived']`).

---

## 3. Webhook (dashboard → Developers → Webhooks)

Point it at: `https://<your-domain>/api/payment/webhook`

- Local dev: expose your API with a tunnel, e.g.
  `cloudflared tunnel --url http://localhost:5000` (or ngrok), and use that URL.
- Handled events: `payment.succeeded` (→ completed), `payment.failed` (→ failed).
- **Before go-live:** verify the Safepay signature header against a webhook
  secret. There's a `TODO(go-live)` marker in `routes/payment.ts` where this
  check belongs — add it before trusting live payloads.

---

## 4. Testing (sandbox)

1. Fill sandbox env vars, restart the API.
2. Log in as an applicant, hit `/app/payment`, click Pay.
3. Use Safepay sandbox test cards (dashboard → Developers → Test Cards) for
   success / failure / 3DS.
4. Confirm in MongoDB that `profiles.paymentStatus` flips to `completed`
   (via both verify-on-return and the webhook).

---

## 5. Go live

1. Swap env to production values + live keys.
2. Update the webhook URL to the production domain; add signature verification.
3. One real small end-to-end transaction before opening to applicants.
4. Confirm your UBL settlement account is attached in the live dashboard's
   payout settings (this is dashboard config, not code).
