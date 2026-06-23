import { Db, ObjectId } from 'mongodb';

/**
 * Proposal Document Schema — staff-mediated matrimonial proposals.
 *
 * STAFF PRE-SCREEN MODEL (v3): staff review happens BEFORE the recipient ever
 * sees a proposal, so no emotional investment is built before vetting.
 *
 * Two types:
 *   USER_PROPOSAL  — initiator proposes. Staff screen FIRST (recipient can't see
 *                    it yet). Staff approve → recipient sees + accepts → chat
 *                    opens immediately (no second review).
 *   STAFF_PROPOSAL — staff manually pair two profiles. Pre-vetted, so skip the
 *                    staff-review stage → straight to pending_recipient (the
 *                    recipient still consents before chat opens).
 *
 * Lifecycle:
 *   USER_PROPOSAL:  pending_staff_review → (staff approve) pending_recipient
 *                   → (recipient accept) chat_active → (both interested)
 *                   family_proposal_stage → completed
 *   STAFF_PROPOSAL: pending_recipient → (recipient accept) chat_active → …
 *
 * Terminal: rejected_by_staff | declined_by_recipient | withdrawn | expired |
 *           family_proposal_stage | completed
 */

export type ProposalType = 'USER_PROPOSAL' | 'STAFF_PROPOSAL';

export type ProposalStatus =
  | 'pending_staff_review'    // created — staff must screen; recipient CANNOT see
  | 'pending_recipient'       // staff approved — now visible to recipient to accept/decline
  | 'mutual_interest_confirmed' // (transient) recipient accepted — chat opening
  | 'chat_active'             // chat open 48h
  | 'family_proposal_stage'   // both interested — families notified, contact shared
  | 'completed'               // closed out after family stage
  | 'expired'                 // chat window elapsed without mutual interest
  | 'rejected_by_staff'       // staff rejected before recipient saw it
  | 'declined_by_recipient'   // recipient declined an approved proposal
  | 'withdrawn';              // initiator withdrew

export type ChatStatus = 'closed' | 'open' | 'expired';

export interface ProposalChat {
  status: ChatStatus;
  openedAt?: Date;
  closesAt?: Date;       // openedAt + 48h
  messageCount: number;
}

export interface ProposalMutualInterest {
  recipientAccepted: boolean;   // recipient agreed to open the proposal (USER flow)
  initiatorInterested: boolean; // after chat — initiator wants to proceed
  recipientInterested: boolean; // after chat — recipient wants to proceed
}

export interface ProposalFamilyEmail {
  sent: boolean;
  sentAt?: Date;
}

export interface QuestionResponse {
  questionId: string;
  response: string;
  respondedBy: ObjectId | string; // profile/account that answered
}

export interface StaffReview {
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: ObjectId;
  notes?: string;
  reviewedAt?: Date;
}

export interface Proposal {
  _id?: ObjectId;
  type: ProposalType;
  matchId?: ObjectId;      // reference to matches collection (if from a suggested match)
  initiatorId: ObjectId;   // profile that originated the proposal
  recipientId: ObjectId;   // profile being proposed to
  createdBy: ObjectId;     // account (user/staff) that issued the request
  createdByRole: 'applicant' | 'staff' | 'admin';

  status: ProposalStatus;

  questionResponses: QuestionResponse[];
  staffReview: StaffReview;

  // Free-text context captured at creation
  message?: string;            // USER: cover message to recipient
  matchNotes?: string;         // USER: staff/initiator match notes
  compatibilityReason?: string;// USER: why they're compatible
  notes?: string;              // STAFF: internal notes
  justification?: string;      // STAFF: why this pairing

  mutualInterest: ProposalMutualInterest;
  chat: ProposalChat;
  familyEmail: ProposalFamilyEmail;

  // Audit of lifecycle transitions
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  reviewReason?: string;
  respondedAt?: Date;          // recipient accept/decline time
  withdrawnAt?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;             // createdAt + 14d (TTL)
}

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const CHAT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Initialize the proposals collection with indexes + TTL.
 */
export async function initProposalsCollection(db: Db): Promise<void> {
  try {
    const col = db.collection('proposals');
    console.log('📊 Creating indexes for proposals collection...');

    await col.createIndex({ initiatorId: 1, status: 1 });
    console.log('   ✓ Index: initiatorId + status');

    await col.createIndex({ recipientId: 1, status: 1 });
    console.log('   ✓ Index: recipientId + status');

    await col.createIndex({ status: 1, createdAt: -1 });
    console.log('   ✓ Index: status + createdAt (staff queue)');

    await col.createIndex({ matchId: 1 });
    console.log('   ✓ Index: matchId');

    await col.createIndex({ 'staffReview.status': 1 });
    console.log('   ✓ Index: staffReview.status');

    // TTL — auto-delete 14 days after expiresAt
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('   ✓ Index: TTL expiry (auto-delete after 14 days)');

    // DB-level write validation (defense in depth beyond the TS interface).
    // validationAction:'warn' logs offending writes without rejecting them, so
    // legacy/edge docs never break; tighten to 'error' once data is clean.
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['type', 'initiatorId', 'recipientId', 'createdBy', 'status', 'mutualInterest', 'chat', 'createdAt', 'expiresAt'],
        properties: {
          type: { enum: ['USER_PROPOSAL', 'STAFF_PROPOSAL'] },
          status: { enum: ['pending_staff_review', 'pending_recipient', 'mutual_interest_confirmed', 'chat_active', 'family_proposal_stage', 'completed', 'expired', 'rejected_by_staff', 'declined_by_recipient', 'withdrawn'] },
          initiatorId: { bsonType: 'objectId' },
          recipientId: { bsonType: 'objectId' },
          createdBy: { bsonType: 'objectId' },
          matchId: { bsonType: ['objectId', 'null'] },
          createdAt: { bsonType: 'date' },
          expiresAt: { bsonType: 'date' },
        },
      },
    };
    try {
      await db.command({ collMod: 'proposals', validator, validationLevel: 'moderate', validationAction: 'warn' });
    } catch {
      try { await db.createCollection('proposals', { validator, validationLevel: 'moderate', validationAction: 'warn' }); } catch { /* exists */ }
    }
    console.log('   ✓ Schema validator applied (warn)');

    console.log('✓ Proposals collection ready!');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ Proposals collection indexes already exist');
    } else {
      throw error;
    }
  }
}

interface CreateProposalInput {
  type: ProposalType;
  matchId?: ObjectId;
  initiatorId: ObjectId;
  recipientId: ObjectId;
  createdBy: ObjectId;
  createdByRole: 'applicant' | 'staff' | 'admin';
  message?: string;
  matchNotes?: string;
  compatibilityReason?: string;
  notes?: string;
  justification?: string;
  questionResponses?: QuestionResponse[];
}

/**
 * Build a new proposal document (staff pre-screen model).
 *   USER_PROPOSAL  → pending_staff_review (staff screen before recipient sees it).
 *   STAFF_PROPOSAL → pending_recipient (pre-vetted; recipient still consents).
 * Chat is always closed at creation — it only opens when the recipient accepts.
 */
export function createProposalDocument(input: CreateProposalInput): Proposal {
  const now = new Date();
  const isStaff = input.type === 'STAFF_PROPOSAL';

  return {
    type: input.type,
    matchId: input.matchId,
    initiatorId: input.initiatorId,
    recipientId: input.recipientId,
    createdBy: input.createdBy,
    createdByRole: input.createdByRole,
    // Staff proposals skip the review stage (already vetted); user proposals are screened first.
    status: isStaff ? 'pending_recipient' : 'pending_staff_review',
    questionResponses: input.questionResponses || [],
    staffReview: isStaff
      ? { status: 'approved', reviewedAt: now, notes: 'Auto-approved (staff proposal)' }
      : { status: 'pending' },
    message: input.message,
    matchNotes: input.matchNotes,
    compatibilityReason: input.compatibilityReason,
    notes: input.notes,
    justification: input.justification,
    mutualInterest: {
      recipientAccepted: false, // recipient consents in both flows now
      initiatorInterested: false,
      recipientInterested: false,
    },
    chat: { status: 'closed', messageCount: 0 }, // opens on recipient accept
    familyEmail: { sent: false },
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  };
}
