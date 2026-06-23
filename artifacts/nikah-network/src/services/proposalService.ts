/**
 * Proposal Service
 * API client for the proposal + chat endpoints (Contract v2).
 * Mirrors matchingService auth convention: Bearer token from localStorage('token').
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type ProposalType = 'USER_PROPOSAL' | 'STAFF_PROPOSAL';

export type ProposalStatus =
  | 'pending_staff_review' | 'pending_recipient' | 'mutual_interest_confirmed'
  | 'chat_active' | 'family_proposal_stage' | 'completed' | 'expired'
  | 'rejected_by_staff' | 'declined_by_recipient' | 'withdrawn';

export interface ProfileSide {
  _id?: string;
  name?: string;
  age?: number;
  city?: string;
  gender?: string;
  caste?: string;
  profession?: string;
  education?: string;
  photo?: string;
  height?: string;
}

export interface ProposalChat {
  status: 'closed' | 'open' | 'expired';
  openedAt?: string;
  closesAt?: string;
  messageCount: number;
}

export interface Proposal {
  _id: string;
  type: ProposalType;
  matchId?: string;
  initiatorId: string;
  recipientId: string;
  status: ProposalStatus;
  message?: string;
  matchNotes?: string;
  compatibilityReason?: string;
  notes?: string;
  justification?: string;
  questionResponses?: QuestionResponse[];
  mutualInterest: { recipientAccepted: boolean; initiatorInterested: boolean; recipientInterested: boolean };
  chat: ProposalChat;
  familyEmail: { sent: boolean; sentAt?: string };
  reviewReason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  initiator?: ProfileSide;
  recipient?: ProfileSide;
  compatibilityScore?: number;
}

export interface ChatMessage {
  _id: string;
  proposalId: string;
  senderId: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

export interface QuestionResponse {
  questionId: string;
  response: string;
  respondedBy: string;
}

export interface CreateProposalInput {
  type: ProposalType;
  matchId?: string;
  initiatorId: string;
  recipientId: string;
  message?: string;
  matchNotes?: string;
  compatibilityReason?: string;
  notes?: string;
  justification?: string;
  questionResponses?: QuestionResponse[];
}

function authHeaders(json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

class ProposalService {
  // ── create ────────────────────────────────────────────────────────────────
  async create(input: CreateProposalInput): Promise<{ proposalId: string; proposal: Proposal }> {
    const res = await fetch(`${API_BASE}/api/proposals`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(input),
    });
    return parse(res);
  }

  // ── user side ───────────────────────────────────────────────────────────────
  async list(role: 'all' | 'initiator' | 'recipient' = 'all'): Promise<{ total: number; proposals: Proposal[] }> {
    const res = await fetch(`${API_BASE}/api/proposals?role=${role}`, { headers: authHeaders(false) });
    return parse(res);
  }

  async get(id: string): Promise<{ proposal: Proposal }> {
    const res = await fetch(`${API_BASE}/api/proposals/${id}`, { headers: authHeaders(false) });
    return parse(res);
  }

  async respond(id: string, action: 'accept' | 'decline'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/proposals/${id}/respond`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ action }),
    });
    return parse(res);
  }

  async withdraw(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/proposals/${id}/withdraw`, {
      method: 'PATCH', headers: authHeaders(false),
    });
    return parse(res);
  }

  async interest(id: string, side?: 'initiator' | 'recipient'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/proposals/${id}/interest`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(side ? { side } : {}),
    });
    return parse(res);
  }

  /** Spec alias for interest — sets the mutual-interest flag. */
  async mutualInterest(id: string, side?: 'initiator' | 'recipient'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/proposals/${id}/mutual-interest`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(side ? { side } : {}),
    });
    return parse(res);
  }

  // ── chat ──────────────────────────────────────────────────────────────────
  async getMessages(id: string): Promise<{ total: number; chat: ProposalChat; messages: ChatMessage[] }> {
    const res = await fetch(`${API_BASE}/api/proposals/${id}/messages`, { headers: authHeaders(false) });
    return parse(res);
  }

  async sendMessage(id: string, text: string): Promise<{ message: ChatMessage }> {
    const res = await fetch(`${API_BASE}/api/proposals/${id}/messages`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ text }),
    });
    return parse(res);
  }

  // ── staff side ──────────────────────────────────────────────────────────────
  async staffList(status?: ProposalStatus): Promise<{ total: number; proposals: Proposal[] }> {
    const qs = status ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE}/api/staff/proposals${qs}`, { headers: authHeaders(false) });
    return parse(res);
  }

  async staffReview(id: string, action: 'approve' | 'reject', reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/staff/proposals/${id}/review`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ action, reason }),
    });
    return parse(res);
  }
}

export default new ProposalService();
