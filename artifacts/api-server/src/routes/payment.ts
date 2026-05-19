import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { logAudit } from '../db/auditLogs';
import crypto from 'crypto';

const router = Router();

// JazzCash Configuration
const JAZZCASH_MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || 'TESTAPIMERCHANT';
const JAZZCASH_PASSWORD = process.env.JAZZCASH_PASSWORD || 'TestPassword123';
const JAZZCASH_INTEGRITY_KEY = process.env.JAZZCASH_INTEGRITY_KEY || 'TestIntegrityKey';
const JAZZCASH_URL = 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction';

/**
 * POST /api/payment/initiate-jazzcash
 * Initiate JazzCash payment
 */
router.post(
  '/initiate-jazzcash',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const db = await getDatabase();
      const usersCollection = db.collection('users');

      const user = await usersCollection.findOne({
        _id: new ObjectId(req.user.id),
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // ✅ CREATE PAYMENT RECORD
      const paymentCollection = db.collection('payments');
      const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      const payment = {
        _id: new ObjectId(),
        userId: new ObjectId(req.user.id),
        email: user.email,
        amount: 4000, // PKR
        currency: 'PKR',
        transactionId,
        status: 'initiated',
        paymentMethod: 'jazzcash',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
      };

      await paymentCollection.insertOne(payment);

      console.log(`✅ Payment initiated: ${transactionId}`);

      // ✅ RETURN PAYMENT DETAILS FOR FRONTEND
      res.json({
        success: true,
        message: 'Payment initiated',
        payment: {
          transactionId,
          amount: 4000,
          currency: 'PKR',
          sandbox: true, // For testing
        },
      });
    } catch (error) {
      console.error('Payment initiation error:', error);
      res.status(500).json({
        error: 'Payment initiation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/payment/confirm-jazzcash
 * Confirm JazzCash payment (webhook from JazzCash or manual)
 */
router.post(
  '/confirm-jazzcash',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId, status, email } = req.body;

      if (!transactionId || !status) {
        res.status(400).json({ error: 'TransactionId and status required' });
        return;
      }

      const db = await getDatabase();
      const paymentCollection = db.collection('payments');
      const usersCollection = db.collection('users');

      // ✅ VERIFY PAYMENT
      const payment = await paymentCollection.findOne({ transactionId });

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // ✅ UPDATE PAYMENT STATUS
      if (status === 'success' || status === 'completed') {
        await paymentCollection.updateOne(
          { transactionId },
          {
            $set: {
              status: 'completed',
              completedAt: new Date(),
            },
          }
        );

        // ✅ UPDATE USER PAYMENT STATUS
        await usersCollection.updateOne(
          { _id: payment.userId },
          {
            $set: {
              paymentStatus: 'completed',
              paymentDate: new Date(),
              paymentTransactionId: transactionId,
              updatedAt: new Date(),
            },
          }
        );

        console.log(`✅ Payment confirmed: ${transactionId}`);

        res.json({
          success: true,
          message: 'Payment confirmed! Full access granted.',
          paymentStatus: 'completed',
        });
      } else {
        // ✅ PAYMENT FAILED
        await paymentCollection.updateOne(
          { transactionId },
          {
            $set: {
              status: 'failed',
              failedAt: new Date(),
            },
          }
        );

        res.status(400).json({
          success: false,
          message: 'Payment failed',
          paymentStatus: 'failed',
        });
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({
        error: 'Payment confirmation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/payment/status/:userId
 * Get payment status for user
 */
router.get(
  '/status/:userId',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId || Array.isArray(userId)) {
        res.status(400).json({ error: 'Invalid userId' });
        return;
      }

      const db = await getDatabase();
      const usersCollection = db.collection('users');

      const user = await usersCollection.findOne({
        _id: new ObjectId(userId),
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        paymentStatus: user.paymentStatus || 'pending',
        canBrowse: user.paymentStatus === 'completed',
        profileCompletion: user.profileCompletion || 0,
      });
    } catch (error) {
      console.error('Error fetching payment status:', error);
      res.status(500).json({
        error: 'Failed to fetch payment status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;