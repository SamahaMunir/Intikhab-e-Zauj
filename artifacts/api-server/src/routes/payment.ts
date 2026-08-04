import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import Safepay from '@sfpy/node-core';
import { getDatabase } from '../db/connection';
import { type AuthRequest } from '../middleware/auth';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Safepay one-time registration fee (Rs. 4000). Uses the hosted Express
// Checkout flow: we mint a checkout URL, redirect the applicant to Safepay's
// hosted page, and mark them paid only after a server-side verify / webhook —
// never on the browser redirect alone.
//
// Amounts are in the lowest denomination (paisa): Rs. 4000 → 400000.
// ─────────────────────────────────────────────────────────────────────────────
const REGISTRATION_FEE_PAISA = 400000;
const CURRENCY = 'PKR';

// Lazily build the SDK client so the server still boots when Safepay isn't
// configured yet (matches how other optional integrations degrade).
let _safepay: any = null;
function getSafepay(): any | null {
  if (_safepay) return _safepay;
  const secret = process.env.SAFEPAY_SECRET_KEY;
  const host = process.env.SAFEPAY_HOST;
  if (!secret || !host) return null;
  _safepay = new Safepay(secret, { authType: 'secret', host });
  return _safepay;
}

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:3000';
const safepayEnv = () =>
  (process.env.SAFEPAY_ENV as 'development' | 'sandbox' | 'production') || 'sandbox';

/**
 * POST /api/payment/create-checkout   (auth)
 * Creates a Safepay payment session + hosted checkout URL for the logged-in
 * applicant, stores the tracker on their profile, and returns the URL to
 * redirect to.
 */
router.post(
  '/create-checkout',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const safepay = getSafepay();
      if (!safepay) {
        res.status(503).json({ error: 'Payments are not configured on the server.' });
        return;
      }

      const db = await getDatabase();
      const profiles = db.collection('profiles');
      const profileId = req.user.id;

      const profile = await profiles.findOne({ _id: new ObjectId(profileId) });
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      // Already paid (or waived) — nothing to do.
      if (['completed', 'waived'].includes(profile.paymentStatus)) {
        res.json({ alreadyPaid: true, paymentStatus: profile.paymentStatus });
        return;
      }

      // 1. Payment session (tracker). Note: Safepay rejects arbitrary metadata
      // keys ("unsupported meta key") — we map tracker→profile via the
      // paymentTracker we store below, so no metadata is needed here.
      const session = await safepay.payments.session.setup({
        merchant_api_key: process.env.SAFEPAY_API_KEY,
        intent: 'CYBERSOURCE',
        mode: 'payment',
        entry_mode: 'raw',
        currency: CURRENCY,
        amount: REGISTRATION_FEE_PAISA,
      });
      const trackerToken = session?.data?.tracker?.token;
      if (!trackerToken) throw new Error('Safepay did not return a tracker token');

      // 2. Short-lived passport (time-based token) for the checkout URL
      const passport = await safepay.client.passport.create();
      const tbt = passport?.data;
      if (!tbt) throw new Error('Safepay did not return a passport token');

      // 3. Hosted checkout URL (returns a plain string)
      const checkoutUrl: string = safepay.checkout.createCheckoutUrl({
        env: safepayEnv(),
        tbt,
        tracker: trackerToken,
        source: 'hosted',
        redirect_url: `${clientUrl()}/app/payment/success`,
        cancel_url: `${clientUrl()}/app/payment/cancel`,
      });

      // Persist the tracker so verify/webhook can match this applicant later.
      await profiles.updateOne(
        { _id: profile._id },
        { $set: { paymentTracker: trackerToken, paymentStatus: 'pending', updatedAt: new Date() } }
      );

      await db.collection('payments').insertOne({
        _id: new ObjectId(),
        profileId: profile._id,
        email: profile.email,
        amount: REGISTRATION_FEE_PAISA / 100,
        currency: CURRENCY,
        tracker: trackerToken,
        provider: 'safepay',
        status: 'initiated',
        createdAt: new Date(),
      });

      console.log(`✅ Safepay checkout created for ${profile.email} — tracker ${trackerToken}`);
      res.json({ checkoutUrl });
    } catch (error) {
      console.error('❌ Safepay checkout error:', error);
      res.status(500).json({
        error: 'Could not start payment session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/** Mark a profile paid by its Safepay tracker (idempotent). */
async function markPaidByTracker(tracker: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.collection('profiles').updateOne(
    { paymentTracker: tracker, paymentStatus: { $ne: 'waived' } },
    { $set: { paymentStatus: 'completed', paymentDate: new Date(), paymentProvider: 'safepay', updatedAt: new Date() } }
  );
  await db.collection('payments').updateOne(
    { tracker },
    { $set: { status: 'completed', completedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

/**
 * GET /api/payment/verify/:tracker   (auth)
 * Authoritative server-side check on return from the hosted page — never trust
 * the redirect alone. Flips the profile to `completed` when Safepay reports the
 * tracker has ended (paid).
 */
router.get(
  '/verify/:tracker',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const safepay = getSafepay();
      if (!safepay) {
        res.status(503).json({ error: 'Payments are not configured on the server.' });
        return;
      }
      const tracker = req.params.tracker;
      if (!tracker || Array.isArray(tracker)) {
        res.status(400).json({ error: 'Invalid tracker' });
        return;
      }

      // Never let the browser cache a verify result — a stale "pending" 304
      // would trap the user even after the payment finalizes.
      res.set('Cache-Control', 'no-store, max-age=0');

      const result = await safepay.reporter.payments.fetch(tracker);
      // The tracker object is returned either at result.data (flat) or
      // result.data.tracker depending on SDK response shape.
      const state = result?.data?.state ?? result?.data?.tracker?.state;

      // TRACKER_ENDED == the hosted payment completed successfully.
      if (state === 'TRACKER_ENDED') {
        await markPaidByTracker(tracker);
        res.json({ status: 'paid' });
        return;
      }
      res.json({ status: 'pending', state });
    } catch (error) {
      console.error('❌ Safepay verify error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  }
);

/**
 * GET /api/payment/status/:userId   (auth)
 * Current payment/access status for a profile (reads the profiles collection,
 * which is what the matching gate checks).
 */
router.get(
  '/status/:userId',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId || Array.isArray(userId)) {
        res.status(400).json({ error: 'Invalid userId' });
        return;
      }
      const db = await getDatabase();
      const profile = await db.collection('profiles').findOne({ _id: new ObjectId(userId) });
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      const paid = ['completed', 'waived'].includes(profile.paymentStatus);
      res.json({
        success: true,
        paymentStatus: profile.paymentStatus || 'pending',
        canBrowse: paid,
        profileCompletion: profile.profileCompletion || 0,
      });
    } catch (error) {
      console.error('Error fetching payment status:', error);
      res.status(500).json({ error: 'Failed to fetch payment status' });
    }
  }
);

/**
 * POST /api/payment/bank-transfer/submit   (auth)
 * Applicant reports a manual Raast / UBL bank transfer. Records the transaction
 * reference and flips the profile to 'submitted' so staff can verify it against
 * the bank statement before granting access. No gateway involved.
 */
router.post(
  '/bank-transfer/submit',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { reference, screenshot } = req.body || {};
      if (!reference || String(reference).trim().length < 3) {
        res.status(400).json({ error: 'A valid transaction ID / reference is required' });
        return;
      }

      const db = await getDatabase();
      const profiles = db.collection('profiles');
      const profile = await profiles.findOne({ _id: new ObjectId(req.user.id) });
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      if (['completed', 'waived'].includes(profile.paymentStatus)) {
        res.json({ alreadyPaid: true, paymentStatus: profile.paymentStatus });
        return;
      }

      const now = new Date();
      await profiles.updateOne(
        { _id: profile._id },
        {
          $set: {
            paymentStatus: 'submitted',
            paymentMethod: 'bank_transfer',
            paymentReference: String(reference).trim(),
            paymentScreenshot: screenshot || null,
            paymentSubmittedAt: now,
            updatedAt: now,
          },
        }
      );
      await db.collection('payments').insertOne({
        _id: new ObjectId(),
        profileId: profile._id,
        email: profile.email,
        amount: REGISTRATION_FEE_PAISA / 100,
        currency: CURRENCY,
        provider: 'bank_transfer',
        reference: String(reference).trim(),
        screenshot: screenshot || null,
        status: 'submitted',
        createdAt: now,
      });

      console.log(`🧾 Bank-transfer submitted for ${profile.email} — ref ${reference}`);
      res.json({ success: true, paymentStatus: 'submitted' });
    } catch (error) {
      console.error('❌ Bank transfer submit error:', error);
      res.status(500).json({ error: 'Could not submit payment' });
    }
  }
);

export default router;

// ─────────────────────────────────────────────────────────────────────────────
// Webhook — mounted WITHOUT authMiddleware (Safepay calls it with no JWT).
// This is the authoritative signal; redirects can be interrupted by the user.
// ─────────────────────────────────────────────────────────────────────────────
export const webhookRouter = Router();

webhookRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO(go-live): verify the Safepay signature header against
    // process.env.SAFEPAY_WEBHOOK_SECRET before trusting the payload.
    const event = req.body;
    const tracker = event?.data?.tracker;

    if (event?.type === 'payment.succeeded' && event?.data?.success && tracker) {
      await markPaidByTracker(tracker);
      console.log(`✅ Webhook: payment succeeded — tracker ${tracker}`);
    } else if (event?.type === 'payment.failed' && tracker) {
      const db = await getDatabase();
      await db.collection('profiles').updateOne(
        { paymentTracker: tracker, paymentStatus: { $ne: 'waived' } },
        { $set: { paymentStatus: 'failed', updatedAt: new Date() } }
      );
      await db.collection('payments').updateOne(
        { tracker },
        { $set: { status: 'failed', failedAt: new Date() } }
      );
      console.log(`❌ Webhook: payment failed — tracker ${tracker}`);
    }

    res.sendStatus(200); // always acknowledge receipt
  } catch (error) {
    console.error('❌ Safepay webhook error:', error);
    res.sendStatus(200); // still 200 so Safepay doesn't hammer retries on our bug
  }
});
