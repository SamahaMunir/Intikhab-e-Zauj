import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { logAudit } from '../db/auditLogs';

const router = Router();

/**
 * POST /api/profile/complete-step
 * Save profile completion step (1-4)
 */
router.post(
  '/complete-step',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { step, data } = req.body;
      
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!step || !data) {
        res.status(400).json({ error: 'Step and data required' });
        return;
      }

      const db = await getDatabase();
      const usersCollection = db.collection('users');

      // ✅ STEP 1: Basic Info (Name, Phone, Gender)
      if (step === 1) {
        const { name, phone, gender } = data;
        if (!name || !phone || !gender) {
          res.status(400).json({ error: 'Name, phone, and gender required' });
          return;
        }

        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          {
            $set: {
              name,
              phone,
              gender,
              profileCompletion: 25,
              updatedAt: new Date(),
            },
          }
        );
      }

      // ✅ STEP 2: Personal Info (DOB, City, Education)
      else if (step === 2) {
        const { dob, city, education } = data;
        if (!dob || !city || !education) {
          res.status(400).json({ error: 'DOB, city, and education required' });
          return;
        }

        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          {
            $set: {
              dob: new Date(dob),
              city,
              education,
              profileCompletion: 50,
              updatedAt: new Date(),
            },
          }
        );
      }

      // ✅ STEP 3: Photo Upload
      else if (step === 3) {
        const { profilePhoto } = data;
        if (!profilePhoto) {
          res.status(400).json({ error: 'Photo required' });
          return;
        }

        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          {
            $set: {
              profilePhoto,
              profileCompletion: 75,
              updatedAt: new Date(),
            },
          }
        );
      }

      // ✅ STEP 4: Professional Info (Profession, Income)
      else if (step === 4) {
        const { profession, income } = data;
        if (!profession) {
          res.status(400).json({ error: 'Profession required' });
          return;
        }

        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          {
            $set: {
              profession,
              income: income || 'Not specified',
              profileCompletion: 100,
              profileCompletedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }

      console.log(`✅ Step ${step} completed for ${req.user.email}`);

      res.json({
        success: true,
        message: `Step ${step} saved`,
        profileCompletion: step * 25,
      });
    } catch (error) {
      console.error('Profile completion error:', error);
      res.status(500).json({
        error: 'Failed to save profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/profile/status
 * Get current profile completion status
 */
router.get(
  '/status',
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

      res.json({
        success: true,
        profileCompletion: user.profileCompletion || 0,
        paymentStatus: user.paymentStatus || 'pending',
        data: {
          name: user.name,
          phone: user.phone,
          gender: user.gender,
          dob: user.dob,
          city: user.city,
          education: user.education,
          profilePhoto: user.profilePhoto,
          profession: user.profession,
          income: user.income,
        },
      });
    } catch (error) {
      console.error('Error fetching profile status:', error);
      res.status(500).json({
        error: 'Failed to fetch status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;