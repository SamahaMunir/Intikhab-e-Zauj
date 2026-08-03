/**
 * Bulk-import real applicant profiles from a CSV export into the `profiles`
 * collection. Built for the staff-collected 2024–2026 sheets (boys + girls in
 * SEPARATE files — gender is set per file via --gender).
 *
 * Each imported row becomes a staff-created, auto-approved, payment-waived
 * profile (no login) — identical shape to the staff "Add Applicant" form, so it
 * appears in the staff Grooms/Brides browse and matches against everyone.
 *
 * CSV columns recognised (case-insensitive, extra columns ignored):
 *   Name, Height, Age, Education, Cast/Caste, Residence, Contact, Contact
 *   (the 2nd Contact → father/guardian), Reg/Reg. (→ regNo)
 *
 * Usage:
 *   DATABASE_URL="<atlas-uri>" node scripts/import-profiles.mjs \
 *     --file ./boys.csv --gender male [--dry] [--photos ./photos]
 *
 *   --file    (required) path to the CSV
 *   --gender  (required) male | female  — applied to every row in the file
 *   --dry     preview counts + first 3 mapped rows, write nothing
 *   --photos  (optional) folder of photos named <Reg>.jpg/.png — data: is NOT
 *             used; if a matching file exists its name is noted for later upload
 *
 * Idempotent: rows whose phone already exists are skipped (re-runnable safely).
 */
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const URI = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017';
const DB = process.env.DB_NAME || 'intikhab_dev';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const FILE = arg('--file');
const GENDER = (arg('--gender') || '').toLowerCase();
const PHOTOS_DIR = arg('--photos');
const DRY = process.argv.includes('--dry');
const UNDO = process.argv.includes('--undo'); // delete the profiles THIS csv created

if (!FILE || !existsSync(FILE)) {
  console.error('❌ --file <path.csv> is required and must exist');
  process.exit(1);
}
// --gender is only required when importing (it labels the rows); undo matches by Reg.
if (!UNDO && GENDER !== 'male' && GENDER !== 'female') {
  console.error('❌ --gender must be "male" or "female"');
  process.exit(1);
}

/** Minimal RFC-4180-ish CSV parser: handles quotes, escaped quotes, CRLF. */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const s = text.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip, handled by \n */ }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

/** Match a header cell to a canonical key, tolerant of spelling/spacing. */
function canonKey(h) {
  const k = h.toLowerCase().replace(/[^a-z]/g, '');
  if (k.startsWith('name')) return 'name';
  if (k.startsWith('height')) return 'height';
  if (k.startsWith('age')) return 'age';
  if (k.startsWith('edu')) return 'education';
  if (k.startsWith('profession') || k.startsWith('job') || k.startsWith('occupation') || k.startsWith('work')) return 'profession';
  if (k.startsWith('cast')) return 'caste';        // "Cast" / "Caste"
  if (k.startsWith('resid') || k === 'city' || k.startsWith('address')) return 'city';
  if (k.startsWith('contact') || k.startsWith('phone') || k.startsWith('mobile')) return 'contact';
  if (k.startsWith('reg')) return 'reg';
  return null;
}

const digits = (v) => String(v || '').replace(/\D/g, '');

/** Synthesize a Jan-1 dob from an age so date-based logic elsewhere works. */
function dobFromAge(age) {
  const n = Number(age);
  if (!n || n <= 0 || n > 120) return null;
  return new Date(Date.UTC(new Date().getUTCFullYear() - n, 0, 1));
}

function indexPhotos(dir) {
  const map = new Map();
  if (!dir || !existsSync(dir)) return map;
  for (const f of readdirSync(dir)) {
    const stem = basename(f, extname(f)).toLowerCase();
    if (stem) map.set(stem, f);
  }
  return map;
}

const run = async () => {
  const rows = parseCSV(readFileSync(FILE, 'utf8'));
  if (rows.length < 2) { console.error('❌ CSV has no data rows'); process.exit(1); }

  const header = rows[0].map(canonKey);
  const contactCols = header.map((k, i) => (k === 'contact' ? i : -1)).filter(i => i !== -1);
  const idxOf = (key) => header.indexOf(key);

  const photos = indexPhotos(PHOTOS_DIR);

  const client = new MongoClient(URI);
  await client.connect();
  const col = client.db(DB).collection('profiles');
  const mode = UNDO ? 'undo (delete)' : 'import';
  console.log(`import-profiles [${mode}]${DRY ? ' (DRY RUN)' : ''} → ${DB}.profiles`);
  console.log(`  file=${FILE}${UNDO ? '' : `  gender=${GENDER}`}  rows=${rows.length - 1}\n`);

  // ── UNDO: remove only the profiles this CSV created ─────────────────────────
  // Matched by Reg (or fallback phone) AND the import-script marker, so real
  // users and manually-added staff profiles can never be deleted.
  if (UNDO) {
    const regs = [];
    for (let r = 1; r < rows.length; r++) {
      const i = header.indexOf('reg');
      const reg = i === -1 ? '' : String(rows[r][i] ?? '').trim();
      if (reg) regs.push(reg);
    }
    const filter = { enteredBy: 'import-script', regNo: { $in: regs } };
    const matched = await col.countDocuments(filter);
    if (!DRY) await col.deleteMany(filter);
    console.log(`  ${DRY ? 'Would delete' : 'Deleted'} : ${matched} imported profile(s) (Reg range ${regs[0]}–${regs[regs.length - 1]})`);
    console.log(`\n${DRY ? 'DRY RUN — nothing deleted.' : 'Done.'}`);
    await client.close();
    return;
  }

  const now = new Date();
  const seenKeys = new Set();
  // Non-name junk rows the sheet uses for cancelled/blocked entries.
  const JUNK_NAMES = new Set(['cancelled', 'blocked', 'void', 'deleted', 'n/a', 'na', '-', 'x', 'xx']);
  let inserted = 0, skippedDup = 0, skippedBad = 0, withPhoto = 0;
  const preview = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (key) => { const i = idxOf(key); return i === -1 ? '' : String(cells[i] ?? '').trim(); };

    const name = get('name');
    if (!name || JUNK_NAMES.has(name.toLowerCase())) { skippedBad++; continue; }

    const reg = get('reg');

    // Collect valid phone numbers from every Contact column. Drop cells Excel
    // mangled into scientific notation (e.g. "9.23244E+11"); keep 10–13 digits.
    const validPhones = contactCols
      .map(i => String(cells[i] ?? '').trim())
      .filter(v => v && !/e\+?\d/i.test(v))
      .map(digits)
      .filter(d => d.length >= 10 && d.length <= 13);
    const phone = validPhones[0] || `noph-${(reg || name).toLowerCase().replace(/\s+/g, '')}-${r}`;
    const fatherPhone = validPhones[1] || '';

    // Dedup on Reg. (unique per applicant) — siblings legitimately share a phone,
    // so phone is NOT a safe key. Fall back to phone only when Reg is missing.
    const key = reg || phone;
    if (seenKeys.has(key)) { skippedDup++; continue; }
    seenKeys.add(key);

    const exists = await col.findOne(reg ? { regNo: reg } : { phone });
    if (exists) { skippedDup++; continue; }

    const photoFile = reg ? photos.get(reg.toLowerCase()) : undefined;
    if (photoFile) withPhoto++;

    const dob = dobFromAge(get('age'));
    const doc = {
      _id: new ObjectId(),
      name,
      // Reg-based so siblings sharing a phone still get unique emails.
      email: `${(reg || phone).toLowerCase().replace(/[^a-z0-9]/g, '')}@intikhab-pending.pk`,
      phone,
      gender: GENDER,
      dob,
      age: Number(get('age')) || undefined,
      role: 'applicant',
      active: true,
      city: get('city'),
      caste: get('caste'),
      height: get('height'),
      education: get('education'),
      profession: get('profession'),
      income: '',
      monthlyIncome: '',
      houseStatus: '',
      houseArea: '',
      bio: '',
      matchCriteria: '',
      desiredMatchDetails: '',
      fatherMobile: fatherPhone || '',
      regNo: reg || '',
      photo: null,
      pendingPhotoFile: photoFile || undefined, // note-only; upload later
      profileCompletion: 100,
      profileStatus: 'approved',
      paymentStatus: 'waived',
      emailVerified: true,
      registeredBy: 'staff',
      source: 'staff_entry',
      notes: reg ? `Imported from CSV — Reg ${reg}` : 'Imported from CSV',
      enteredBy: 'import-script',
      enteredAt: now,
      createdAt: now,
      updatedAt: now,
    };

    if (preview.length < 3) preview.push({ name, gender: GENDER, age: doc.age, city: doc.city, caste: doc.caste, height: doc.height, phone, fatherMobile: doc.fatherMobile, photo: photoFile || '(none)' });

    if (!DRY) await col.insertOne(doc);
    inserted++;
  }

  console.log('First mapped rows:');
  for (const p of preview) console.log('  ', JSON.stringify(p));
  console.log('');
  console.log(`  ${DRY ? 'Would insert' : 'Inserted'} : ${inserted}`);
  console.log(`  Skipped (duplicate phone)   : ${skippedDup}`);
  console.log(`  Skipped (no name)           : ${skippedBad}`);
  if (PHOTOS_DIR) console.log(`  Matched photo files (noted) : ${withPhoto}`);
  console.log(`\n${DRY ? 'DRY RUN — nothing written.' : 'Done.'}`);
  await client.close();
};

run().catch(e => { console.error('import failed:', e); process.exit(1); });
