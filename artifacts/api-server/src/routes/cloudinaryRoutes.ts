import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/cloudinary/signature
 * Generate Cloudinary upload signature
 */
router.post('/signature', async (req: Request, res: Response) => {
  try {
    console.log('🔐 Signature request received');
    const { folder, timestamp: clientTimestamp } = req.body;

    // Validate input
    if (!folder) {
      console.error('❌ Missing folder');
      return res.status(400).json({ error: 'Folder required' });
    }

    // Validate folder (prevent path traversal)
    const validFolders = ['profiles', 'documents', 'counselling'];
    if (!validFolders.includes(folder)) {
      console.error('❌ Invalid folder:', folder);
      return res.status(400).json({ error: 'Invalid folder' });
    }

    // Use provided timestamp or generate new one
    const timestamp = clientTimestamp || Math.floor(Date.now() / 1000);
    const now = Math.floor(Date.now() / 1000);
    
    console.log(`📅 Server time: ${now}, Client time: ${clientTimestamp}, Using: ${timestamp}`);

    // Validate timestamp is not too old
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 300) { // 5 minutes
      console.error(`⏰ Timestamp too old. Difference: ${timeDiff}s`);
      return res.status(400).json({
        error: 'Timestamp too old',
        timeDiff,
        serverTime: now,
        clientTime: clientTimestamp
      });
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      console.error('❌ CLOUDINARY_API_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Build string to sign
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    console.log(`📝 Signing: folder=${folder}&timestamp=${timestamp}[SECRET]`);

    // Generate signature
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    console.log(`✅ Signature generated: ${signature.substring(0, 10)}...`);

    res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error('❌ Signature error:', error);
    res.status(500).json({
      error: 'Failed to generate signature',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;