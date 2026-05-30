import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';

const router = Router();

router.post('/initiate-jazzcash', async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }

    const db = await getDatabase();
    const oid = new ObjectId(userId);

    // Create payment record
    const payment = {
      _id: new ObjectId(),
      userId: oid,
      amount,
      method: 'jazzcash',
      status: 'initiated',
      createdAt: new Date(),
    };

    await db.collection('payments').insertOne(payment);

    // Update user paymentStatus
    await db.collection('users').updateOne(
      { _id: oid },
      { $set: { paymentStatus: 'completed' } }
    );

    await db.collection('profiles').updateOne(
      { _id: oid },
      { $set: { paymentStatus: 'completed' } }
    );

    res.json({ success: true, message: 'Payment initiated', paymentId: payment._id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Payment failed' });
  }
});

export default router;