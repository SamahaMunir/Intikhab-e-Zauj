---
noteId: "ab838e90755d11f1830b0bce8ea744b0"
tags: []

---

# SMS setup — enabling family notifications

## Why families weren't being notified

The family-stage logic is working. When a proposal reaches
`family_proposal_stage`, the app **emails the two applicants** and **SMSes the
families** (father/mother mobiles). The SMS half was silent because **no SMS
gateway is configured** — the adapter runs in `disabled` mode and logs
`📱 [SMS:disabled]` instead of sending.

Turn SMS on by setting the env vars below in `artifacts/api-server/.env.local`,
then restart the server.

## Free test mode (no gateway, no cost)

To test the whole flow without paying for a gateway, set just:

```ini
SMS_PROVIDER=console
```

In this mode every SMS is **printed to the server log** (`📱 [SMS:console] → …`)
and reported as `sent:true`, so the family-stage flow behaves as if delivered.
Nothing is sent to real phones. Switch `SMS_PROVIDER` to `jazz`/`generic` with
real credentials (below) before launch.

## Env vars (real gateway)

Pakistani SMS goes through Jazz Business bulk-SMS or an aggregator (VeevoTech,
Eocean, Twilio…). Almost all use the same query-string HTTP API, so one config
fits them:

```ini
# Required
SMS_PROVIDER=jazz              # jazz | generic  (anything else = disabled)
SMS_API_URL=https://gateway.example.com/api/sendsms
SMS_SENDER_MASK=IntikhabZauj   # your PTA-approved sender mask / shortcode

# Credentials — use EITHER id+password OR an api key (whichever your gateway uses)
SMS_API_ID=your_account_id
SMS_API_PASSWORD=your_account_password
# SMS_API_KEY=your_api_key

# Optional — only if your gateway uses different query-param names.
# Defaults: id, pass, key, to, mask, msg
# SMS_PARAM_ID=username
# SMS_PARAM_PASS=password
# SMS_PARAM_KEY=apikey
# SMS_PARAM_TO=mobile
# SMS_PARAM_MASK=from
# SMS_PARAM_MSG=text
```

The adapter builds: `GET {SMS_API_URL}?{id}=..&{pass}=..&{to}=92XXXXXXXXXX&{mask}=..&{msg}=..`
Numbers are auto-normalized to `92XXXXXXXXXX` (accepts `03xx…`, `+92…`, etc.).

### Vendor hints
- **Jazz Business**: they give you API URL + id/password + an approved mask. Set
  `SMS_PROVIDER=jazz`. Adjust `SMS_PARAM_*` to match their doc if param names differ.
- **VeevoTech / Eocean / generic**: `SMS_PROVIDER=generic`, set URL + creds, then
  map `SMS_PARAM_*` to that vendor's field names.

## Test it (no need to run a whole proposal)

As an **admin**, call the test endpoint:

```bash
curl -X POST "$API/api/staff/test-sms" \
  -H "Authorization: Bearer <staff_token>" \
  -H "Content-Type: application/json" \
  -d '{"to":"03001234567"}'
```

Response tells you exactly what happened:
- `{ "success": true, "result": { "sent": true, ... } }` → gateway works.
- `sent:false, error:"sms_provider_not_configured"` → `SMS_PROVIDER` still unset.
- `sent:false, error:"sms_credentials_missing"` → URL/creds missing.
- `sent:false, error:"gateway_error: ..."` → gateway rejected it (check mask/creds/balance).

## Also required for family notifications

Family SMS goes to **`fatherMobile` / `motherMobile`** on each profile. Those
fields must be filled (profile wizard / staff data-entry capture them). If a
profile has no family mobiles, there's simply no one to SMS — the applicant still
gets the email.

## Security note

This gateway style puts credentials in the URL query string (GET). That's how
these PK gateways work, but it means creds can appear in server/gateway access
logs. Keep `SMS_API_*` secret, and prefer a key with SMS-send-only scope.
