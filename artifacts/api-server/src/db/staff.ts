import { Db, ObjectId } from 'mongodb';
import crypto from 'crypto';

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

let staffCollection: any;

export async function initStaffCollection(db: Db) {
  staffCollection = db.collection('staff');
  
  await staffCollection.createIndex({ email: 1 }, { unique: true });
  await staffCollection.createIndex({ status: 1 });
  await staffCollection.createIndex({ inviteToken: 1 });
  await staffCollection.createIndex({ createdAt: -1 });
  
  console.log('✓ Staff collection initialized');
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
  if (!staffCollection) throw new Error('Staff collection not initialized');

  const existing = await staffCollection.findOne({ email });
  if (existing) {
    throw new Error('Staff with this email already exists');
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

  const result = await staffCollection.insertOne(staff);
  
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/staff/setup?token=${inviteToken}`;

  return { 
    staff: { ...staff, _id: result.insertedId },
    inviteLink 
  };
}

/**
 * Verify invite token and set password
 */
export async function setPasswordWithInvite(
  token: string,
  password: string
): Promise<Staff> {
  if (!staffCollection) throw new Error('Staff collection not initialized');

  const staff = await staffCollection.findOne({ inviteToken: token });

  if (!staff) {
    throw new Error('Invalid invite token');
  }

  if (new Date() > staff.inviteExpiresAt) {
    throw new Error('Invite expired');
  }

  const result = await staffCollection.updateOne(
    { inviteToken: token },
    {
      $set: {
        password,
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

  return staffCollection.findOne({ email: staff.email });
}

/**
 * Get staff by email
 */
export async function getStaffByEmail(email: string): Promise<Staff | null> {
  if (!staffCollection) return null;
  return staffCollection.findOne({ email });
}

/**
 * Get all staff
 */
export async function getAllStaff(): Promise<Staff[]> {
  if (!staffCollection) return [];
  return staffCollection.find({}).sort({ createdAt: -1 }).toArray();
}

/**
 * Deactivate staff
 */
export async function deactivateStaff(email: string): Promise<boolean> {
  if (!staffCollection) return false;
  const result = await staffCollection.updateOne(
    { email },
    { $set: { status: 'inactive' } }
  );
  return result.modifiedCount > 0;
}

/**
 * Activate staff
 */
export async function activateStaff(email: string): Promise<boolean> {
  if (!staffCollection) return false;
  const result = await staffCollection.updateOne(
    { email },
    { $set: { status: 'active' } }
  );
  return result.modifiedCount > 0;
}

/**
 * Update last login
 */
export async function updateLastLogin(email: string): Promise<void> {
  if (!staffCollection) return;
  await staffCollection.updateOne(
    { email },
    { $set: { lastLogin: new Date() } }
  );
}

/**
 * Delete staff
 */
export async function deleteStaff(email: string): Promise<boolean> {
  if (!staffCollection) return false;
  const result = await staffCollection.deleteOne({ email });
  return result.deletedCount > 0;
}

/**
 * Resend invite
 */
export async function resendInvite(email: string): Promise<string> {
  if (!staffCollection) throw new Error('Staff collection not initialized');

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await staffCollection.updateOne(
    { email },
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