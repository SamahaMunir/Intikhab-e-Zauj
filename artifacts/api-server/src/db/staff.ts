import { Db, ObjectId } from 'mongodb';
import crypto from 'crypto';
import { hashPassword } from '../utils/password.js';

/**
 * Staff records now live in the SHARED `profiles` collection (single source of
 * truth for all users), distinguished by `role in ['staff','admin']`. Applicants
 * have role 'applicant'. This module keeps its original function names so callers
 * (routes/auth.ts, routes/staffRoutes.ts) are unchanged — only the storage moved.
 *
 * Staff docs are excluded from matching because the candidate query filters by
 * gender + profileStatus:'approved' + paymentStatus, none of which staff have.
 *
 * Migration for existing data: run scripts/migrate-staff-to-profiles.mjs once.
 */

export interface Staff {
  _id?: ObjectId;
  email: string;
  name: string;
  password?: string; // Optional until set
  passwordSet: boolean;
  role: 'staff' | 'admin';
  status: 'active' | 'inactive' | 'invited';
  inviteToken?: string;
  inviteExpiresAt?: Date;
  createdAt: Date;
  createdBy: string;
  lastLogin?: Date;
}

const STAFF_ROLES = ['staff', 'admin'];

// The shared users collection (`profiles`). Named `usersCol` internally; the
// public API still speaks in "staff" terms.
let usersCol: any;

export async function initStaffCollection(db: Db) {
  usersCol = db.collection('profiles');

  // Indexes that support staff lookups, on the shared collection.
  // NOTE: email index is intentionally NON-unique here to avoid failing on any
  // legacy duplicate emails. Make it unique later, after deduping the data.
  await usersCol.createIndex({ email: 1 });
  await usersCol.createIndex({ role: 1, status: 1 });
  await usersCol.createIndex({ inviteToken: 1 });

  console.log('✓ Staff (stored in profiles collection) initialized');
}

/**
 * Invite staff member (admin only)
 */
export async function inviteStaff(
  email: string,
  name: string,
  role: 'staff' | 'admin',
  createdBy: string
): Promise<{ staff: Staff; inviteLink: string }> {
  if (!usersCol) throw new Error('Users collection not initialized');

  // Email must be globally unique across ALL users (applicant or staff).
  const existing = await usersCol.findOne({ email });
  if (existing) {
    throw new Error('A user with this email already exists');
  }

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const staff: Staff = {
    email,
    name,
    role,
    status: 'invited',
    passwordSet: false,
    inviteToken,
    inviteExpiresAt,
    createdAt: new Date(),
    createdBy,
  };

  // Mark provenance so staff docs are clearly distinguishable in the shared collection.
  const result = await usersCol.insertOne({ ...staff, source: 'staff_entry', registeredBy: 'staff' });

  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/staff/setup?token=${inviteToken}`;

  return {
    staff: { ...staff, _id: result.insertedId },
    inviteLink,
  };
}

/**
 * Verify invite token and set password
 */
export async function setPasswordWithInvite(
  token: string,
  password: string
): Promise<Staff> {
  if (!usersCol) throw new Error('Users collection not initialized');

  const staff = await usersCol.findOne({ inviteToken: token, role: { $in: STAFF_ROLES } });

  if (!staff) {
    throw new Error('Invalid invite token');
  }

  if (new Date() > staff.inviteExpiresAt) {
    throw new Error('Invite expired');
  }

  const result = await usersCol.updateOne(
    { inviteToken: token },
    {
      $set: {
        password: hashPassword(password),
        passwordSet: true,
        status: 'active',
        inviteToken: null,
        inviteExpiresAt: null,
      },
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error('Failed to set password');
  }

  return usersCol.findOne({ email: staff.email, role: { $in: STAFF_ROLES } });
}

/**
 * Get staff by email (only matches staff/admin — never an applicant)
 */
export async function getStaffByEmail(email: string): Promise<Staff | null> {
  if (!usersCol) return null;
  return usersCol.findOne({ email, role: { $in: STAFF_ROLES } });
}

/**
 * Get all staff
 */
export async function getAllStaff(): Promise<Staff[]> {
  if (!usersCol) return [];
  return usersCol.find({ role: { $in: STAFF_ROLES } }).sort({ createdAt: -1 }).toArray();
}

/**
 * Deactivate staff
 */
export async function deactivateStaff(email: string): Promise<boolean> {
  if (!usersCol) return false;
  const result = await usersCol.updateOne(
    { email, role: { $in: STAFF_ROLES } },
    { $set: { status: 'inactive' } }
  );
  return result.modifiedCount > 0;
}

/**
 * Activate staff
 */
export async function activateStaff(email: string): Promise<boolean> {
  if (!usersCol) return false;
  const result = await usersCol.updateOne(
    { email, role: { $in: STAFF_ROLES } },
    { $set: { status: 'active' } }
  );
  return result.modifiedCount > 0;
}

/**
 * Update last login (staff only — won't touch an applicant with the same email)
 */
export async function updateLastLogin(email: string): Promise<void> {
  if (!usersCol) return;
  await usersCol.updateOne(
    { email, role: { $in: STAFF_ROLES } },
    { $set: { lastLogin: new Date() } }
  );
}

/**
 * Delete staff
 */
export async function deleteStaff(email: string): Promise<boolean> {
  if (!usersCol) return false;
  const result = await usersCol.deleteOne({ email, role: { $in: STAFF_ROLES } });
  return result.deletedCount > 0;
}

/**
 * Resend invite
 */
export async function resendInvite(email: string): Promise<string> {
  if (!usersCol) throw new Error('Users collection not initialized');

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await usersCol.updateOne(
    { email, role: { $in: STAFF_ROLES } },
    {
      $set: {
        inviteToken,
        inviteExpiresAt,
      },
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error('Staff not found');
  }

  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/staff/setup?token=${inviteToken}`;
  return inviteLink;
}
