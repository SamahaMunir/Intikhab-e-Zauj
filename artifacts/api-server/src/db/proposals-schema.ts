import { Db, ObjectId } from 'mongodb';

/**
 * Proposal Document Schema — staff-mediated matrimonial proposals.
 *
 * Two types (Contract v2):
 *   USER_PROPOSAL  — initiator proposes to a recipient. Recipient must accept,
 *                    then staff reviews, then approved → chat opens 48h.
 *   STAFF_PROPOSAL — staff creates an internal proposal between two profiles.
 *                    Approved immediately (skips recipient-accept + staff review)
 *                    → chat opens 48h.
 *
 * Lifecycle:
 *   USER_PROPOSAL:  pending_recipient → (accept) pending_staff → (review)
 *                   approved → (both interested) completed → family email
 *   STAFF_PROPOSAL: approved → (both interested) completed → family email
 *
 * Terminal: rejected | declined | withdrawn | expired | closed | completed
 */

export type ProposalType = 'USER_PROPOSAL' | 'STAFF_PROPOSAL';

export type ProposalStatus =
  | 'pending_recipient' // waiting for recipient to accept/decline (USER only)
  | 'pending_staff'     // recipient accepted, waiting for staff review (USER only)
  | 'approved'          // staff approved (or STAFF auto) — chat open
  | 'rejected'          // staff rejected
  | 'declined'          // recipient declined
  | 'withdrawn'         // initiator withdrew
  | 'expired'           // chat window elapsed without mutual interest
  | 'completed'         // both interested — family stage
  | 'closed';           // manually closed

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
 * Build a new proposal document. STAFF_PROPOSAL starts approved with chat open;
 * USER_PROPOSAL starts pending_recipient with chat closed.
 */
export function createProposalDocument(input: CreateProposalInput): Proposal {
  const now = new Date();
  const isStaff = input.type === 'STAFF_PROPOSAL';

  const chat: ProposalChat = isStaff
    ? {
        status: 'open',
        openedAt: now,
        closesAt: new Date(now.getTime() + CHAT_WINDOW_MS),
        messageCount: 0,
      }
    : { status: 'closed', messageCount: 0 };

  return {
    type: input.type,
    matchId: input.matchId,
    initiatorId: input.initiatorId,
    recipientId: input.recipientId,
    createdBy: input.createdBy,
    createdByRole: input.createdByRole,
    status: isStaff ? 'approved' : 'pending_recipient',
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
      recipientAccepted: isStaff, // staff proposals skip recipient-accept
      initiatorInterested: false,
      recipientInterested: false,
    },
    chat,
    familyEmail: { sent: false },
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  };
}
