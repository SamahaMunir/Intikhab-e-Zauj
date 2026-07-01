/**
 * SMS adapter.
 *
 * NOTE: JazzCash is a *payment* wallet — it has no SMS gateway. Pakistani SMS is
 * sent via the Jazz **Business** bulk-SMS service or an aggregator (VeevoTech,
 * Eocean, Twilio…). Almost all of them expose the same simple HTTP API:
 *
 *   GET {SMS_API_URL}?{idParam}={id}&{passParam}={pass}&{toParam}={msisdn}
 *       &{maskParam}={sender}&{msgParam}={text}
 *
 * The `jazz` / `generic` branch below implements exactly that, fully driven by
 * env so it fits whichever gateway is signed up for — no code change to flip on.
 *
 * Until SMS_PROVIDER + credentials are set, sends are logged and reported as
 * not-sent (sent:false); the caller treats that as a soft failure, never throws.
 *
 *   SMS_PROVIDER     = jazz | generic | console   (anything else → disabled)
 *                      'console' = free test mode: logs the message, reports
 *                      sent:true (no gateway, no cost).
 *   SMS_API_URL      = https://gateway.example.com/api/sendsms
 *   SMS_API_ID       = account username / api id
 *   SMS_API_PASSWORD = account password   (or use SMS_API_KEY for key-based gw)
 *   SMS_API_KEY      = api key/hash        (alternative to id+password)
 *   SMS_SENDER_MASK  = PTA-approved sender mask / shortcode
 *   SMS_PARAM_*      = optional param-name overrides (id|pass|key|to|mask|msg)
 */

export interface SmsResult {
  to: string;
  sent: boolean;
  provider: string;
  providerId?: string; // gateway message id, when returned
  error?: string;
}

const SMS_TIMEOUT_MS = 10_000;

const PK_INTL_PREFIX = '92';

/** Normalize a Pakistani mobile to E.164-ish (+92XXXXXXXXXX). Best-effort. */
export function normalizeMobile(raw?: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = PK_INTL_PREFIX + d.slice(1);       // 03xx... → 923xx...
  else if (d.startsWith('3') && d.length === 10) d = PK_INTL_PREFIX + d; // 3xx... → 923xx...
  if (!d.startsWith(PK_INTL_PREFIX) || d.length < 11) return null;
  return '+' + d;
}

/**
 * Send one SMS. Never throws — returns a result the caller can log/aggregate.
 */
export async function sendSms(rawTo: string, message: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER || 'none';
  const to = normalizeMobile(rawTo);

  if (!to) {
    return { to: rawTo, sent: false, provider, error: 'invalid_mobile' };
  }

  if (provider === 'none') {
    // No gateway configured — log intent so it's visible in dev/staging.
    console.log(`📱 [SMS:disabled] → ${to}: ${message.slice(0, 120)}${message.length > 120 ? '…' : ''}`);
    return { to, sent: false, provider, error: 'sms_provider_not_configured' };
  }

  if (provider === 'console') {
    // Free test mode — no real gateway. Print the full message and report success
    // so the whole flow (family stage, etc.) behaves as if delivered. Use for
    // local/dev testing; switch SMS_PROVIDER to a real gateway before launch.
    console.log(`📱 [SMS:console] → ${to}: ${message}`);
    return { to, sent: true, provider, providerId: 'console' };
  }

  // ── Jazz Business / generic Pakistani HTTP gateway ──────────────────────────
  if (provider === 'jazz' || provider === 'generic') {
    return sendViaHttpGateway(to, message, provider);
  }

  console.warn(`📱 [SMS] provider='${provider}' set but no implementation wired — skipping ${to}`);
  return { to, sent: false, provider, error: 'provider_not_implemented' };
}

/**
 * Send through a query-string HTTP gateway (Jazz Business, VeevoTech, Eocean…).
 * Param names are configurable so one implementation fits multiple vendors.
 * Never throws — failures come back as { sent:false, error }.
 */
async function sendViaHttpGateway(to: string, message: string, provider: string): Promise<SmsResult> {
  const url = process.env.SMS_API_URL;
  const id = process.env.SMS_API_ID;
  const pass = process.env.SMS_API_PASSWORD;
  const key = process.env.SMS_API_KEY;
  const mask = process.env.SMS_SENDER_MASK;

  // Need an endpoint + at least one credential form (id+pass OR key).
  if (!url || (!key && !(id && pass))) {
    console.warn(`📱 [SMS:${provider}] missing SMS_API_URL / credentials — not sent to ${to}`);
    return { to, sent: false, provider, error: 'sms_credentials_missing' };
  }

  // Param-name overrides (vendor-specific). Defaults match common PK gateways.
  const P = {
    id:   process.env.SMS_PARAM_ID   || 'id',
    pass: process.env.SMS_PARAM_PASS || 'pass',
    key:  process.env.SMS_PARAM_KEY  || 'key',
    to:   process.env.SMS_PARAM_TO   || 'to',
    mask: process.env.SMS_PARAM_MASK || 'mask',
    msg:  process.env.SMS_PARAM_MSG  || 'msg',
  };

  // Gateways expect the local 92XXXXXXXXXX form (no leading +).
  const msisdn = to.replace(/^\+/, '');

  const qs = new URLSearchParams();
  if (key) qs.set(P.key, key);
  if (id) qs.set(P.id, id);
  if (pass) qs.set(P.pass, pass);
  qs.set(P.to, msisdn);
  if (mask) qs.set(P.mask, mask);
  qs.set(P.msg, message);

  const endpoint = `${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SMS_TIMEOUT_MS);
  try {
    const resp = await fetch(endpoint, { method: 'GET', signal: ctrl.signal });
    const body = (await resp.text().catch(() => '')).trim();

    // Heuristic success: HTTP 2xx and body not signalling an error. Tighten this
    // to the exact vendor response once the gateway is chosen.
    const looksError = /error|fail|invalid|denied|insufficient/i.test(body);
    if (!resp.ok || looksError) {
      console.warn(`📱 [SMS:${provider}] gateway rejected ${to}: HTTP ${resp.status} ${body.slice(0, 160)}`);
      return { to, sent: false, provider, error: `gateway_error: ${body.slice(0, 120) || resp.status}` };
    }

    console.log(`📱 [SMS:${provider}] sent → ${to}`);
    return { to, sent: true, provider, providerId: body.slice(0, 120) || undefined };
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError' ? 'timeout' : (err instanceof Error ? err.message : 'send_failed');
    console.warn(`📱 [SMS:${provider}] send failed for ${to}: ${reason}`);
    return { to, sent: false, provider, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

/** Send the same message to several numbers. Aggregates results. */
export async function sendSmsBatch(recipients: (string | undefined)[], message: string): Promise<SmsResult[]> {
  const seen = new Set<string>();
  const results: SmsResult[] = [];
  for (const r of recipients) {
    if (!r) continue;
    const norm = normalizeMobile(r);
    if (norm && seen.has(norm)) continue;       // de-dupe valid numbers
    if (norm) seen.add(norm);
    results.push(await sendSms(r, message));
  }
  return results;
}
