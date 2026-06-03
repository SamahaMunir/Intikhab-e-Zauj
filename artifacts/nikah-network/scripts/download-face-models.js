/**
 * Download face-api.js TinyFaceDetector model files into /public/models/face-api/
 * Run once: node scripts/download-face-models.js
 *
 * After this, the app loads models locally without any CDN dependency.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET_DIR = path.join(__dirname, '..', 'public', 'models', 'face-api');
const BASE_URL   = 'https://justadudewhohacks.github.io/face-api.js/models';

// TinyFaceDetector — smallest model (~180 KB), sufficient for portrait detection
const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  ✓ Already exists: ${path.basename(dest)}`);
      resolve();
      return;
    }
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log(`  ✓ Downloaded: ${path.basename(dest)}`); resolve(); });
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`\nDownloading TinyFaceDetector model to: ${TARGET_DIR}\n`);
  for (const file of FILES) {
    await download(`${BASE_URL}/${file}`, path.join(TARGET_DIR, file));
  }
  console.log('\n✅ Done. Face detection will now load models locally.\n');
}

main().catch(err => { console.error('❌ Download failed:', err.message); process.exit(1); });
