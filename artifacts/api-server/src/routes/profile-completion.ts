import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

const router = Router();

router.post(
  '/complete',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const {
        name, dateOfBirth, age, height, caste, motherTongue, disability,
        religion, sect, prayerRegularity, cnic, education, institution,
        profession, jobType, designation, monthlyIncome, officeAddress,
        city, address, fatherName, fatherOccupation, motherName, motherOccupation,
        fatherMobile, motherMobile, siblingsMobile, numBrothers, numMarriedBrothers,
        numSisters, numMarriedSisters, employedSiblingsDetails, siblingDisability,
        homeOwnership, homeSize, areaValue, matchCriteria, desiredMatchDetails,
        reference, referenceRelation, acceptMarriedPerson, gender, photo,
      } = req.body;

      if (!name || !caste || !city || !profession) {
        res.status(400).json({ error: 'Name, caste, city, and profession are required' });
        return;
      }
      if (!photo) {
        res.status(400).json({ error: 'Profile photo is required' });
        return;
      }

      // Backend safety: only accept Cloudinary URLs from our own cloud account.
      // This prevents frontend bypass — even if someone calls the API directly
      // with a random URL, it will be rejected.
      const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
      const isValidPhotoUrl =
        typeof photo === 'string' &&
        photo.startsWith('https://') &&
        (
          // Must be from our Cloudinary account AND in the profiles/ folder
          (photo.includes(`res.cloudinary.com/${CLOUD_NAME}/`) && photo.includes('/profiles/')) ||
          // Allow UI-avatars for seed/staff-created profiles
          photo.includes('ui-avatars.com') ||
          // Allow pravatar for existing seed data during transition
          photo.includes('pravatar.cc')
        );

      if (!isValidPhotoUrl) {
        res.status(400).json({
          error: 'Invalid profile photo URL',
          message: 'Photo must be uploaded via the platform upload system.',
        });
        return;
      }

      const db = await getDatabase();

      // Pre-save duplicate guard: CNIC + photo uniqueness
      {
        const normCNIC = (raw: string) => raw.replace(/[-\s]/g, '');
        const dupClauses: any[] = [];
        if (cnic) {
          const n = normCNIC(cnic);
          if (n.length === 13) {
            const fmt = `${n.slice(0, 5)}-${n.slice(5, 12)}-${n.slice(12)}`;
            dupClauses.push({ cnic: { $in: [cnic, n, fmt] } });
          }
        }
        if (photo && photo.includes('res.cloudinary.com')) {
          dupClauses.push({ photo });
        }
        if (dupClauses.length > 0) {
          const dup = await db.collection('profiles').findOne(
            { $or: dupClauses, _id: { $ne: new ObjectId(req.user.id) } },
            { projection: { _id: 1, cnic: 1, photo: 1 } },
          );
          if (dup) {
            const isCnic = cnic && normCNIC(dup.cnic || '') === normCNIC(cnic);
            res.status(409).json({
              error: 'Duplicate profile',
              field: isCnic ? 'cnic' : 'photo',
              message: isCnic
                ? 'This CNIC is already registered to another profile'
                : 'This photo is already used by another profile',
            });
            return;
          }
        }
      }

      await db.collection('profiles').updateOne(
        { _id: new ObjectId(req.user.id) },
        {
          $set: {
            name,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            age: Number(age) || 0,
            height: height || '',
            caste,
            motherTongue: motherTongue || '',
            disability: disability || 'No',
            religion: religion || 'Islam',
            sect: sect || '',
            prayerRegularity: prayerRegularity || 'Regular',
            cnic: cnic || '',
            education: education || '',
            institution: institution || '',
            profession,
            jobType: jobType || '',
            designation: designation || '',
            monthlyIncome: monthlyIncome || '',
            officeAddress: officeAddress || '',
            city,
            address: address || '',
            fatherName: fatherName || '',
            fatherOccupation: fatherOccupation || '',
            motherName: motherName || '',
            motherOccupation: motherOccupation || '',
            fatherMobile: fatherMobile || '',
            motherMobile: motherMobile || '',
            siblingsMobile: siblingsMobile || '',
            numBrothers: numBrothers || 0,
            numMarriedBrothers: numMarriedBrothers || 0,
            numSisters: numSisters || 0,
            numMarriedSisters: numMarriedSisters || 0,
            employedSiblingsDetails: employedSiblingsDetails || '',
            siblingDisability: siblingDisability || 'No',
            homeOwnership: homeOwnership || 'owned',
            homeSize: homeSize || 'kanal',
            areaValue: areaValue || 0,
            houseStatus: homeOwnership || 'owned',
            houseArea: areaValue && Number(areaValue) > 0 ? String(areaValue) : '',
            matchCriteria: matchCriteria || '',
            desiredMatchDetails: desiredMatchDetails || '',
            reference: reference || '',
            referenceRelation: referenceRelation || '',
            acceptMarriedPerson: acceptMarriedPerson || null,
            // Only update gender if wizard explicitly sent a valid value
            ...(gender === 'male' || gender === 'female' ? { gender } : {}),
            photo: photo || '',       // Cloudinary URL
            profileCompletion: 100,
            profileStatus: 'pending',
          },
        }
      );

      res.json({ success: true, message: 'Profile saved. Awaiting staff approval.', profileCompletion: 100 });
    } catch (error) {
      console.error('Profile complete error:', error);
      res.status(500).json({ error: 'Failed to save profile', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
);

/**
 * GET /api/profile/view/:id
 * Fetch any approved applicant profile by ID.
 * Used by the matches "View Profile" feature.
 * Requires authentication. Returns only approved profiles to prevent browsing unapproved ones.
 */
router.get(
  '/view/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const id = (req.params as any).id as string;
      if (!id || !ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid profile ID' });
        return;
      }

      const db = await getDatabase();
      const proj = { projection: { password: 0, verificationToken: 0, verificationTokenExpiry: 0 } };

      // Search both collections — profiles (main) and users (simple-register)
      let profile =
        await db.collection('profiles').findOne({ _id: new ObjectId(id) }, proj) ||
        await db.collection('users').findOne({ _id: new ObjectId(id) }, proj);

      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      // Only show approved profiles to other users
      if (profile.profileStatus !== 'approved') {
        res.status(403).json({ error: 'This profile is not yet available for viewing.' });
        return;
      }

      res.json({ success: true, profile: { ...profile, _id: profile._id.toString() } });
    } catch (error) {
      console.error('[profile/view]', error);
      res.status(500).json({ error: 'Failed to load profile' });
    }
  }
);

/**
 * GET /api/profile/me
 * Return the authenticated user's full profile — used by wizard to pre-populate
 */
router.get(
  '/me',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const db   = await getDatabase();
      const proj = { projection: { password: 0, verificationToken: 0, verificationTokenExpiry: 0 } };
      const oid  = new ObjectId(req.user.id);

      // Try 'profiles' first (main registration flow), then 'users' (simple-register flow)
      let profile = await db.collection('profiles').findOne({ _id: oid }, proj);
      if (!profile) {
        profile = await db.collection('users').findOne({ _id: oid }, proj);
      }

      if (!profile) {
        console.warn(`[profile/me] No profile found for id=${req.user.id} in profiles OR users collections`);
        res.status(404).json({ error: 'Profile not found. Please complete registration.' });
        return;
      }

      res.json({ success: true, profile });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load profile' });
    }
  }
);

/**
 * PATCH /api/profile/me/update
 * Update any editable profile field from the profile edit UI.
 */
router.patch(
  '/me/update',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const EDITABLE = [
        'name', 'height', 'caste', 'motherTongue', 'disability',
        'religion', 'sect', 'prayerRegularity', 'cnic', 'bio',
        'education', 'institution', 'profession', 'jobType', 'designation',
        'monthlyIncome', 'officeAddress',
        'city', 'address', 'homeOwnership', 'homeSize', 'areaValue',
        'fatherName', 'fatherOccupation', 'motherName', 'motherOccupation',
        'fatherMobile', 'motherMobile', 'siblingsMobile',
        'numBrothers', 'numMarriedBrothers', 'numSisters', 'numMarriedSisters',
        'employedSiblingsDetails', 'siblingDisability',
        'matchCriteria', 'desiredMatchDetails', 'acceptMarriedPerson',
        'reference', 'referenceRelation', 'photo',
      ] as const;

      const updates: Record<string, unknown> = {};
      for (const field of EDITABLE) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      // Validate photo if present
      if (updates.photo) {
        const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
        const url = String(updates.photo);
        const valid =
          url.startsWith('https://') &&
          (
            (url.includes(`res.cloudinary.com/${CLOUD_NAME}/`) && url.includes('/profiles/')) ||
            url.includes('randomuser.me')
          );
        if (!valid) {
          res.status(400).json({ error: 'Invalid photo URL' });
          return;
        }
      }

      // Sync derived fields
      if (updates.homeOwnership !== undefined) updates.houseStatus = updates.homeOwnership;
      if (updates.areaValue    !== undefined) updates.houseArea   = String(updates.areaValue);

      // Handle dateOfBirth → derive age
      if (req.body.dateOfBirth) {
        const dob = new Date(req.body.dateOfBirth);
        if (!isNaN(dob.getTime())) {
          updates.dateOfBirth = dob;
          updates.dob         = dob;
          const now = new Date();
          let age = now.getFullYear() - dob.getFullYear();
          if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
          updates.age = Math.max(0, age);
        }
      }

      updates.updatedAt = new Date();

      const db = await getDatabase();
      // Try profiles collection first, fall back to users
      const r = await db.collection('profiles').updateOne(
        { _id: new ObjectId(req.user.id) }, { $set: updates }
      );
      if (r.matchedCount === 0) {
        await db.collection('users').updateOne(
          { _id: new ObjectId(req.user.id) }, { $set: updates }
        );
      }

      res.json({ success: true, message: 'Profile updated' });
    } catch (error) {
      console.error('[PATCH /profile/me/update]', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

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
      const usersCollection = db.collection('profiles');

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

        // Backend safety: must be a Cloudinary URL from our account in the profiles/ folder
        const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
        const isValidPhotoUrl =
          typeof profilePhoto === 'string' &&
          profilePhoto.startsWith('https://') &&
          profilePhoto.includes(`res.cloudinary.com/${CLOUD_NAME}/`) &&
          profilePhoto.includes('/profiles/');

        if (!isValidPhotoUrl) {
          res.status(400).json({
            error: 'Invalid profile photo URL',
            message: 'Photo must be uploaded via the platform upload system.',
          });
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
      const usersCollection = db.collection('profiles');

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

// GET /api/profile/check-duplicate?phone=xxx&email=xxx&cnic=xxx&fatherMobile=xxx&motherMobile=xxx&photo=xxx&excludeId=xxx
// No auth required — used by registration and staff data-entry forms.
router.get('/check-duplicate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { phone, email, cnic, fatherMobile, motherMobile, photo, excludeId } =
      req.query as Record<string, string | undefined>;

    if (!phone && !email && !cnic && !fatherMobile && !motherMobile && !photo) {
      res.status(400).json({ error: 'Provide at least one field to check' });
      return;
    }

    const normalizePhone = (raw: string): string => {
      const digits = raw.replace(/\D/g, '');
      if (digits.startsWith('92') && digits.length === 12) return `+${digits}`;
      if (digits.startsWith('0')  && digits.length === 11) return `+92${digits.slice(1)}`;
      if (digits.length === 10)                            return `+92${digits}`;
      return raw;
    };
    const normalizeCNIC = (raw: string): string => raw.replace(/[-\s]/g, '');

    const orClauses: any[] = [];
    if (phone) {
      const norm = normalizePhone(phone);
      orClauses.push({ phone: { $in: [phone, norm] } });
    }
    if (email) {
      orClauses.push({ email: { $regex: `^${email.trim()}$`, $options: 'i' } });
    }
    if (cnic) {
      const normCnic = normalizeCNIC(cnic);
      if (normCnic.length === 13) {
        const formatted = `${normCnic.slice(0, 5)}-${normCnic.slice(5, 12)}-${normCnic.slice(12)}`;
        orClauses.push({ cnic: { $in: [cnic, normCnic, formatted] } });
      }
    }
    // Parent phones are checked against applicant phone to catch own-number-as-parent tricks
    if (fatherMobile) {
      const norm = normalizePhone(fatherMobile);
      orClauses.push({ phone: { $in: [fatherMobile, norm] } });
    }
    if (motherMobile) {
      const norm = normalizePhone(motherMobile);
      orClauses.push({ phone: { $in: [motherMobile, norm] } });
    }
    if (photo) {
      orClauses.push({ photo });
    }

    const db = await getDatabase();
    const query: any = { $or: orClauses };

    if (excludeId) {
      try { query._id = { $ne: new ObjectId(excludeId) }; } catch { /* invalid id — ignore */ }
    }

    const existing = await db.collection('profiles').findOne(query, {
      projection: { _id: 1, phone: 1, email: 1, cnic: 1, photo: 1, name: 1 },
    });

    if (!existing) {
      res.json({ duplicate: false });
      return;
    }

    // Determine which input field triggered the match
    const normExistingPhone = existing.phone ? normalizePhone(existing.phone) : '';
    let field = 'unknown';
    let message = 'Duplicate detected';

    if (phone && (existing.phone === phone || normExistingPhone === normalizePhone(phone))) {
      field = 'phone';
      message = `Phone ${phone} is already registered`;
    } else if (email && existing.email?.toLowerCase() === email.trim().toLowerCase()) {
      field = 'email';
      message = `Email ${email} is already registered`;
    } else if (cnic && normalizeCNIC(existing.cnic || '') === normalizeCNIC(cnic)) {
      field = 'cnic';
      message = 'This CNIC is already registered to another profile';
    } else if (fatherMobile && (existing.phone === fatherMobile || normExistingPhone === normalizePhone(fatherMobile))) {
      field = 'fatherMobile';
      message = "Father's mobile matches another applicant's registered phone number";
    } else if (motherMobile && (existing.phone === motherMobile || normExistingPhone === normalizePhone(motherMobile))) {
      field = 'motherMobile';
      message = "Mother's mobile matches another applicant's registered phone number";
    } else if (photo && existing.photo === photo) {
      field = 'photo';
      message = 'This photo is already used by another profile';
    }

    res.json({ duplicate: true, field, message });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Check failed' });
  }
});

export default router;