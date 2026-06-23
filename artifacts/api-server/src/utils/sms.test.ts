import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { normalizeMobile, sendSms, sendSmsBatch } from './sms';

/**
 * SMS adapter tests — no real gateway, no cost. `fetch` is mocked so we can
 * assert the exact URL/params the adapter builds and how it parses responses.
 */

// Capture the URL the adapter calls + control the gateway's reply.
function mockGateway(reply: { ok?: boolean; status?: number; body?: string }) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string) => {
    calls.push(url);
    return {
      ok: reply.ok ?? true,
      status: reply.status ?? 200,
      text: async () => reply.body ?? 'OK',
    } as any;
  });
  vi.stubGlobal('fetch', fn);
  return { calls };
}

const GATEWAY = 'https://gw.example.com/api/sendsms';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('normalizeMobile', () => {
  it('converts local 03xx to +92', () => {
    expect(normalizeMobile('0301-2345678')).toBe('+923012345678');
  });
  it('accepts +92 and 0092 forms', () => {
    expect(normalizeMobile('+923012345678')).toBe('+923012345678');
    expect(normalizeMobile('00923012345678')).toBe('+923012345678');
  });
  it('rejects junk / too short', () => {
    expect(normalizeMobile('123')).toBeNull();
    expect(normalizeMobile('')).toBeNull();
    expect(normalizeMobile(undefined)).toBeNull();
  });
});

describe('sendSms — disabled (no provider)', () => {
  it('reports not-sent when SMS_PROVIDER unset', async () => {
    const r = await sendSms('03012345678', 'hi');
    expect(r.sent).toBe(false);
    expect(r.error).toBe('sms_provider_not_configured');
  });
});

describe('sendSms — invalid number', () => {
  it('fails before calling the gateway', async () => {
    vi.stubEnv('SMS_PROVIDER', 'jazz');
    const { calls } = mockGateway({});
    const r = await sendSms('123', 'hi');
    expect(r.sent).toBe(false);
    expect(r.error).toBe('invalid_mobile');
    expect(calls.length).toBe(0);
  });
});

describe('sendSms — jazz/generic gateway', () => {
  beforeEach(() => {
    vi.stubEnv('SMS_PROVIDER', 'jazz');
    vi.stubEnv('SMS_API_URL', GATEWAY);
    vi.stubEnv('SMS_API_ID', 'user1');
    vi.stubEnv('SMS_API_PASSWORD', 'pass1');
    vi.stubEnv('SMS_SENDER_MASK', 'NikahNet');
  });

  it('missing creds → not sent, no call', async () => {
    vi.stubEnv('SMS_API_ID', '');
    vi.stubEnv('SMS_API_PASSWORD', '');
    const { calls } = mockGateway({});
    const r = await sendSms('03012345678', 'hi');
    expect(r.sent).toBe(false);
    expect(r.error).toBe('sms_credentials_missing');
    expect(calls.length).toBe(0);
  });

  it('builds the correct URL + params and reports sent', async () => {
    const { calls } = mockGateway({ body: 'OK:12345' });
    const r = await sendSms('0301-2345678', 'Your match is confirmed');
    expect(r.sent).toBe(true);
    expect(r.providerId).toBe('OK:12345');

    expect(calls.length).toBe(1);
    const u = new URL(calls[0]);
    expect(u.origin + u.pathname).toBe(GATEWAY);
    expect(u.searchParams.get('id')).toBe('user1');
    expect(u.searchParams.get('pass')).toBe('pass1');
    expect(u.searchParams.get('mask')).toBe('NikahNet');
    expect(u.searchParams.get('to')).toBe('923012345678'); // no leading +
    expect(u.searchParams.get('msg')).toBe('Your match is confirmed');
  });

  it('honours SMS_PARAM_* overrides (e.g. VeevoTech)', async () => {
    vi.stubEnv('SMS_API_ID', '');
    vi.stubEnv('SMS_API_PASSWORD', '');
    vi.stubEnv('SMS_API_KEY', 'hash123');
    vi.stubEnv('SMS_PARAM_KEY', 'hash');
    vi.stubEnv('SMS_PARAM_TO', 'receivenum');
    vi.stubEnv('SMS_PARAM_MSG', 'textmessage');
    vi.stubEnv('SMS_PARAM_MASK', 'sendernum');

    const { calls } = mockGateway({ body: 'OK' });
    await sendSms('03012345678', 'hello');
    const u = new URL(calls[0]);
    expect(u.searchParams.get('hash')).toBe('hash123');
    expect(u.searchParams.get('receivenum')).toBe('923012345678');
    expect(u.searchParams.get('textmessage')).toBe('hello');
    expect(u.searchParams.get('sendernum')).toBe('NikahNet');
  });

  it('treats an error body as not-sent', async () => {
    mockGateway({ body: 'ERROR: insufficient balance' });
    const r = await sendSms('03012345678', 'hi');
    expect(r.sent).toBe(false);
    expect(r.error).toMatch(/gateway_error/);
  });

  it('treats non-2xx as not-sent', async () => {
    mockGateway({ ok: false, status: 401, body: 'Unauthorized' });
    const r = await sendSms('03012345678', 'hi');
    expect(r.sent).toBe(false);
  });
});

describe('sendSmsBatch', () => {
  beforeEach(() => {
    vi.stubEnv('SMS_PROVIDER', 'jazz');
    vi.stubEnv('SMS_API_URL', GATEWAY);
    vi.stubEnv('SMS_API_KEY', 'k');
  });

  it('de-dupes the same number and skips empties', async () => {
    const { calls } = mockGateway({ body: 'OK' });
    const results = await sendSmsBatch(['03012345678', '0301-2345678', undefined, ''], 'hi');
    expect(results.length).toBe(1); // duplicate collapsed, empties dropped
    expect(calls.length).toBe(1);
  });
});
