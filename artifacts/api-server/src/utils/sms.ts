/**
 * SMS adapter.
 *
 * No SMS gateway is integrated yet (JazzCash here is payment-only). This adapter
 * is the single seam where a provider plugs in. Until SMS_PROVIDER + credentials
 * are set in env, sends are logged and reported as not-sent (sent:false) — the
 * caller treats that as a soft failure, never throwing.
 *
 * To enable: implement the provider branch below (e.g. Twilio / a Pakistani SMS
 * gateway) and set SMS_PROVIDER + the matching env vars.
 */

export interface SmsResult {
  to: string;
  sent: boolean;
  provider: string;
  error?: string;
}

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

  // ── Provider implementations go here ────────────────────────────────────────
  // Example:
  //   if (provider === 'twilio') { ...await client.messages.create(...); return {to, sent:true, provider}; }
  // ----------------------------------------------------------------------------

  console.warn(`📱 [SMS] provider='${provider}' set but no implementation wired — skipping ${to}`);
  return { to, sent: false, provider, error: 'provider_not_implemented' };
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
