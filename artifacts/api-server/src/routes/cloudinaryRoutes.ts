import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * Generate Cloudinary upload signature
 * This prevents users from bypassing upload restrictions
 */
router.post('/signature', async (req: Request, res: Response) => {
  try {
    const { folder } = req.body;

    if (!folder) {
      return res.status(400).json({ error: 'Folder required' });
    }

    // Validate folder (prevent path traversal)
    const validFolders = ['profiles', 'documents', 'counselling'];
    if (!validFolders.includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Build string to sign
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

    // Generate signature
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    res.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
    });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({
      error: 'Failed to generate signature',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;