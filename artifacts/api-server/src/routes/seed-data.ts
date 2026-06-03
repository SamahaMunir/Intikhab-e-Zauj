import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection';
import {
  generateFemaleProfiles,
  generateMaleProfiles,
  generateMixedDataset,
  validateSeedProfile,
} from '../lib/seedGenerator';

const router = Router();

/**
 * POST /api/seed
 * Wipes applicant profiles and inserts fresh seed data.
 * Staff accounts are never touched.
 */
router.post('/', async (_req: Request, res: Response) => {
  try {
    const db  = await getDatabase();
    const col = db.collection('profiles');

    // Safe delete: applicants only, staff/admin preserved
    const deleted = await col.deleteMany({ role: 'applicant' });

    // Generate 8 female + 7 male profiles (15 total)
    const females = generateFemaleProfiles(8, 0);
    const males   = generateMaleProfiles(7, 0);
    const all     = [...females, ...males];

    // Validate all before any insert — fail fast
    const validationErrors: string[] = [];
    for (const p of all) {
      const errs = validateSeedProfile(p);
      if (errs.length > 0) validationErrors.push(`"${p.name}": ${errs.join('; ')}`);
    }
    if (validationErrors.length > 0) {
      res.status(422).json({ error: 'Seed validation failed', details: validationErrors });
      return;
    }

    await col.insertMany(all);

    res.json({
      success: true,
      message: `Deleted ${deleted.deletedCount} old profiles. Inserted ${all.length} fresh seed profiles.`,
      breakdown: {
        female: females.length,
        male:   males.length,
        total:  all.length,
        photos: 'randomuser.me — real human faces, gender-locked by URL path',
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Seed failed', message: err instanceof Error ? err.message : 'Unknown' });
  }
});

/**
 * POST /api/seed/female?count=N  — generate only female profiles
 * POST /api/seed/male?count=N    — generate only male profiles
 * POST /api/seed/mixed?count=N   — generate balanced mix
 */
router.post('/female', async (req: Request, res: Response) => {
  await insertGenerated(req, res, count => generateFemaleProfiles(count));
});
router.post('/male', async (req: Request, res: Response) => {
  await insertGenerated(req, res, count => generateMaleProfiles(count));
});
router.post('/mixed', async (req: Request, res: Response) => {
  await insertGenerated(req, res, count => generateMixedDataset(count));
});

async function insertGenerated(
  req: Request,
  res: Response,
  generator: (count: number) => ReturnType<typeof generateFemaleProfiles>
) {
  try {
    const count = Math.min(50, Math.max(1, parseInt(String(req.query.count)) || 10));
    const db  = await getDatabase();
    const col = db.collection('profiles');
    const profiles = generator(count);

    const errors: string[] = [];
    for (const p of profiles) {
      const errs = validateSeedProfile(p);
      if (errs.length > 0) errors.push(`"${p.name}": ${errs.join('; ')}`);
    }
    if (errors.length > 0) {
      res.status(422).json({ error: 'Validation failed', details: errors });
      return;
    }

    await col.insertMany(profiles);
    res.json({ success: true, inserted: profiles.length });
  } catch (err) {
    res.status(500).json({ error: 'Seed failed', message: err instanceof Error ? err.message : 'Unknown' });
  }
}

export default router;
