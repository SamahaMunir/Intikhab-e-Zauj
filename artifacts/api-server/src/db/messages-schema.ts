import { Db, ObjectId } from 'mongodb';

/**
 * Message Document Schema — chat messages inside an approved proposal.
 *
 * Chat is only writable while the parent proposal is `approved` and within its
 * 48h window (proposal.chat.closesAt). Messages auto-delete 14 days after
 * creation (TTL), matching the proposal lifetime.
 */
export interface Message {
  _id?: ObjectId;
  proposalId: ObjectId;
  senderId: ObjectId | string; // account that sent it (profile ObjectId, or staff id which may be a non-ObjectId string)
  senderRole: 'applicant' | 'staff' | 'admin';
  text: string;
  createdAt: Date;
  expiresAt: Date;           // createdAt + 14d (TTL)
}

export const MESSAGE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const MAX_MESSAGE_LEN = 2000;

/**
 * Initialize the messages collection with indexes + TTL.
 */
export async function initMessagesCollection(db: Db): Promise<void> {
  try {
    const col = db.collection('messages');
    console.log('📊 Creating indexes for messages collection...');

    // Fetch a proposal's thread in order
    await col.createIndex({ proposalId: 1, createdAt: 1 });
    console.log('   ✓ Index: proposalId + createdAt');

    await col.createIndex({ senderId: 1 });
    console.log('   ✓ Index: senderId');

    // TTL — auto-delete 14 days after expiresAt
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('   ✓ Index: TTL expiry (auto-delete after 14 days)');

    // DB-level write validation (validationAction:'warn' — non-rejecting).
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['proposalId', 'senderId', 'text', 'createdAt', 'expiresAt'],
        properties: {
          proposalId: { bsonType: 'objectId' },
          senderId: { bsonType: ['objectId', 'string'] },
          text: { bsonType: 'string', maxLength: MAX_MESSAGE_LEN },
          createdAt: { bsonType: 'date' },
          expiresAt: { bsonType: 'date' },
        },
      },
    };
    try {
      await db.command({ collMod: 'messages', validator, validationLevel: 'moderate', validationAction: 'warn' });
    } catch {
      try { await db.createCollection('messages', { validator, validationLevel: 'moderate', validationAction: 'warn' }); } catch { /* exists */ }
    }
    console.log('   ✓ Schema validator applied (warn)');

    console.log('✓ Messages collection ready!');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ Messages collection indexes already exist');
    } else {
      throw error;
    }
  }
}

export function createMessageDocument(
  proposalId: ObjectId,
  senderId: ObjectId | string,
  senderRole: 'applicant' | 'staff' | 'admin',
  text: string
): Message {
  const now = new Date();
  return {
    proposalId,
    senderId,
    senderRole,
    text,
    createdAt: now,
    expiresAt: new Date(now.getTime() + MESSAGE_TTL_MS),
  };
}
