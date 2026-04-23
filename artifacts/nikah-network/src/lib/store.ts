import { create } from "zustand";
import { persist } from "zustand/middleware";
import { subDays, addDays } from "date-fns";
import { computeMatchScore } from "./matching";

export type Role = "applicant" | "staff" | "admin";
export type ProfileStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  avatar?: string;
  profileStatus: ProfileStatus;
  gender: "M" | "F";
  dob: string;
  city: string;
  caste: string;
  education: string;
  occupation: string;
  income: number;
  bio: string;
  maritalStatus: "single" | "divorced" | "widowed";
  children: number;
  preferences: {
    ageMin: number;
    ageMax: number;
    locationRadius: number;
    castePrefs: string[];
    educationMin: string;
    incomeMin: number;
  };
  completion: number;
}

export interface Match {
  id: string;
  userAId: string;
  userBId: string;
  score: number;
  breakdown: { age: number; location: number; caste: number; education: number; income: number; children: number };
  status: "suggested" | "approved" | "rejected";
  generatedAt: string;
}

export interface Proposal {
  id: string;
  initiatorId: string;
  recipientId: string;
  status: "pending_staff_approval" | "approved" | "rejected" | "accepted" | "declined" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface Message {
  id: string;
  proposalId: string;
  senderId: string;
  text: string;
  type: "question" | "reply";
  status: "pending_staff_review" | "approved" | "rejected";
  createdAt: string;
}

export interface Config {
  weights: { age: number; location: number; caste: number; education: number; income: number };
  qa: { maxQuestions: number; commDays: number; minScore: number };
}

export interface AuditLog {
  id: string;
  staffId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  timestamp: string;
}

export interface CounsellingRequest {
  id: string;
  userId: string;
  type: "pre_marriage" | "post_marriage";
  status: "pending" | "assigned" | "completed";
  topic: string;
  createdAt: string;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  matches: Match[];
  proposals: Proposal[];
  messages: Message[];
  counselling: CounsellingRequest[];
  auditLogs: AuditLog[];
  config: Config;

  login: (id: string) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
  
  // App actions
  updateProfile: (id: string, data: Partial<User>) => void;
  sendProposal: (initiatorId: string, recipientId: string) => void;
  approveProposal: (id: string, staffId: string) => void;
  rejectProposal: (id: string, staffId: string, reason: string) => void;
  askQuestion: (proposalId: string, senderId: string, text: string) => void;
  replyMessage: (proposalId: string, senderId: string, text: string) => void;
  approveMessage: (id: string, staffId: string) => void;
  rejectMessage: (id: string, staffId: string, reason: string) => void;
  hideMatch: (id: string, staffId: string) => void;
  rejectMatch: (id: string, staffId: string, reason?: string) => void;
  approveMatch: (id: string, staffId: string) => void;
  generateMatchesFor: (userId: string) => void;
  approveProfile: (id: string, staffId: string) => void;
  rejectProfile: (id: string, staffId: string, reason: string) => void;
  register: (user: User) => void;
  flagMessage: (id: string, staffId: string, reason: string) => void;
  requestCounselling: (userId: string, type: "pre_marriage" | "post_marriage", topic: string) => void;
  assignCounselling: (id: string, staffId: string) => void;
  completeCounselling: (id: string, staffId: string) => void;
  updateConfig: (config: Partial<Config>) => void;
}

const seedUsers: User[] = [
  {
    id: "staff1", email: "staff@nikahnetwork.pk", role: "staff", name: "Ayesha Staff", profileStatus: "approved",
    gender: "F", dob: "1980-01-01", city: "Lahore", caste: "N/A", education: "Masters", occupation: "Counsellor", income: 100000,
    bio: "Staff member", maritalStatus: "single", children: 0,
    preferences: { ageMin: 0, ageMax: 0, locationRadius: 0, castePrefs: [], educationMin: "", incomeMin: 0 }, completion: 100
  },
  {
    id: "u1", email: "zainab@example.com", role: "applicant", name: "Zainab Ali", profileStatus: "approved", avatar: "/assets/images/avatar-w1.png",
    gender: "F", dob: "1995-05-10", city: "Lahore", caste: "Arain", education: "Bachelors", occupation: "Teacher", income: 60000,
    bio: "I am a simple, family-oriented teacher looking for a respectful partner.", maritalStatus: "single", children: 0,
    preferences: { ageMin: 28, ageMax: 35, locationRadius: 50, castePrefs: ["Arain", "Rajput"], educationMin: "Bachelors", incomeMin: 80000 }, completion: 100
  },
  {
    id: "u2", email: "ahmed@example.com", role: "applicant", name: "Ahmed Raza", profileStatus: "approved", avatar: "/assets/images/avatar-m1.png",
    gender: "M", dob: "1992-08-20", city: "Lahore", caste: "Rajput", education: "Masters", occupation: "Software Engineer", income: 150000,
    bio: "Working as a SWE. I value deen, family, and honest communication.", maritalStatus: "single", children: 0,
    preferences: { ageMin: 22, ageMax: 29, locationRadius: 100, castePrefs: ["Arain", "Rajput"], educationMin: "Bachelors", incomeMin: 0 }, completion: 100
  },
  {
    id: "u3", email: "sara@example.com", role: "applicant", name: "Sara Khan", profileStatus: "pending",
    gender: "F", dob: "1998-02-15", city: "Islamabad", caste: "Pathan", education: "Masters", occupation: "Doctor", income: 120000,
    bio: "Doctor at a local hospital. Seeking a supportive partner.", maritalStatus: "single", children: 0,
    preferences: { ageMin: 26, ageMax: 32, locationRadius: 200, castePrefs: ["Pathan", "Any"], educationMin: "Masters", incomeMin: 100000 }, completion: 80
  },
  {
    id: "u4", email: "fatima@example.com", role: "applicant", name: "Fatima Sheikh", profileStatus: "approved",
    gender: "F", dob: "1996-11-03", city: "Lahore", caste: "Sheikh", education: "Masters", occupation: "Banker", income: 90000,
    bio: "Looking for a like-minded, family-oriented partner.", maritalStatus: "single", children: 0,
    preferences: { ageMin: 28, ageMax: 36, locationRadius: 100, castePrefs: ["Sheikh", "Any"], educationMin: "Bachelors", incomeMin: 100000 }, completion: 100
  },
  {
    id: "u5", email: "bilal@example.com", role: "applicant", name: "Bilal Hussain", profileStatus: "approved",
    gender: "M", dob: "1990-04-12", city: "Lahore", caste: "Sheikh", education: "Masters", occupation: "Marketing Manager", income: 180000,
    bio: "Practising Muslim, marketing professional.", maritalStatus: "single", children: 0,
    preferences: { ageMin: 25, ageMax: 32, locationRadius: 100, castePrefs: ["Any"], educationMin: "Bachelors", incomeMin: 0 }, completion: 100
  },
  {
    id: "u6", email: "hina@example.com", role: "applicant", name: "Hina Malik", profileStatus: "approved",
    gender: "F", dob: "1994-07-22", city: "Karachi", caste: "Malik", education: "Bachelors", occupation: "Designer", income: 70000,
    bio: "Creative designer, family-first.", maritalStatus: "single", children: 0,
    preferences: { ageMin: 28, ageMax: 36, locationRadius: 200, castePrefs: ["Any"], educationMin: "Bachelors", incomeMin: 80000 }, completion: 100
  },
  {
    id: "u7", email: "umar@example.com", role: "applicant", name: "Umar Farooq", profileStatus: "approved",
    gender: "M", dob: "1989-09-30", city: "Karachi", caste: "Pathan", education: "MPhil", occupation: "University Lecturer", income: 130000,
    bio: "Academic, value deen and family.", maritalStatus: "single", children: 0,
    preferences: { ageMin: 26, ageMax: 33, locationRadius: 200, castePrefs: ["Any"], educationMin: "Bachelors", incomeMin: 0 }, completion: 100
  }
];

const defaultWeights = { age: 0.2, location: 0.2, caste: 0.2, education: 0.2, income: 0.2 };

function buildSeedMatches(): Match[] {
  const approved = seedUsers.filter(u => u.role === "applicant" && u.profileStatus === "approved");
  const out: Match[] = [];
  const seen = new Set<string>();
  for (const a of approved) {
    for (const b of approved) {
      if (a.id >= b.id) continue;
      if (a.gender === b.gender) continue;
      const key = [a.id, b.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const { total, breakdown } = computeMatchScore(a, b, defaultWeights);
      if (total < 40) continue;
      out.push({
        id: `seed-${a.id}-${b.id}`,
        userAId: a.id,
        userBId: b.id,
        score: total,
        breakdown,
        status: "suggested",
        generatedAt: new Date().toISOString(),
      });
    }
  }
  return out;
}

const seedMatches: Match[] = buildSeedMatches();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: seedUsers[1], // default applicant
      users: seedUsers,
      matches: seedMatches,
      proposals: [
        { id: "p1", initiatorId: "u2", recipientId: "u1", status: "approved", createdAt: subDays(new Date(), 2).toISOString(), expiresAt: addDays(new Date(), 12).toISOString() },
        { id: "p2", initiatorId: "u3", recipientId: "u2", status: "pending_staff_approval", createdAt: new Date().toISOString(), expiresAt: addDays(new Date(), 14).toISOString() }
      ],
      messages: [
        { id: "msg1", proposalId: "p1", senderId: "u2", text: "What are your expectations regarding living arrangements after marriage?", type: "question", status: "approved", createdAt: subDays(new Date(), 1).toISOString() }
      ],
      counselling: [
        { id: "c1", userId: "u1", type: "pre_marriage", status: "pending", topic: "Financial Planning", createdAt: new Date().toISOString() }
      ],
      auditLogs: [],
      config: {
        weights: { age: 0.2, location: 0.2, caste: 0.2, education: 0.2, income: 0.2 },
        qa: { maxQuestions: 10, commDays: 14, minScore: 65 }
      },

      login: (id) => set(state => ({ currentUser: state.users.find(u => u.id === id) || null })),
      logout: () => set({ currentUser: null }),
      switchRole: (role) => set(state => {
        if (role === "staff") return { currentUser: state.users.find(u => u.role === "staff") };
        if (role === "applicant") return { currentUser: state.users.find(u => u.id === "u1") };
        return state;
      }),

      updateProfile: (id, data) => set(state => ({
        users: state.users.map(u => u.id === id ? { ...u, ...data } : u),
        currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...data } : state.currentUser
      })),

      sendProposal: (initiatorId, recipientId) => set(state => {
        const newProp: Proposal = {
          id: `p${Date.now()}`,
          initiatorId,
          recipientId,
          status: "pending_staff_approval",
          createdAt: new Date().toISOString(),
          expiresAt: addDays(new Date(), 14).toISOString()
        };
        return { proposals: [...state.proposals, newProp] };
      }),

      approveProposal: (id, staffId) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "approve_proposal", resourceType: "proposal", resourceId: id, reason: "Looks good", timestamp: new Date().toISOString() };
        return {
          proposals: state.proposals.map(p => p.id === id ? { ...p, status: "approved" } : p),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      rejectProposal: (id, staffId, reason) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "reject_proposal", resourceType: "proposal", resourceId: id, reason, timestamp: new Date().toISOString() };
        return {
          proposals: state.proposals.map(p => p.id === id ? { ...p, status: "rejected" } : p),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      askQuestion: (proposalId, senderId, text) => set(state => ({
        messages: [...state.messages, { id: `msg${Date.now()}`, proposalId, senderId, text, type: "question", status: "pending_staff_review", createdAt: new Date().toISOString() }]
      })),

      replyMessage: (proposalId, senderId, text) => set(state => ({
        messages: [...state.messages, { id: `msg${Date.now()}`, proposalId, senderId, text, type: "reply", status: "pending_staff_review", createdAt: new Date().toISOString() }]
      })),

      approveMessage: (id, staffId) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "approve_message", resourceType: "message", resourceId: id, reason: "Appropriate content", timestamp: new Date().toISOString() };
        return {
          messages: state.messages.map(m => m.id === id ? { ...m, status: "approved" } : m),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      rejectMessage: (id, staffId, reason) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "reject_message", resourceType: "message", resourceId: id, reason, timestamp: new Date().toISOString() };
        return {
          messages: state.messages.map(m => m.id === id ? { ...m, status: "rejected" } : m),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      hideMatch: (id, staffId) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "hide_match", resourceType: "match", resourceId: id, reason: "Staff hidden", timestamp: new Date().toISOString() };
        return {
          matches: state.matches.map(m => m.id === id ? { ...m, status: "rejected" } : m),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      rejectMatch: (id, staffId, reason) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "reject_match", resourceType: "match", resourceId: id, reason: reason || "Not a fit", timestamp: new Date().toISOString() };
        return {
          matches: state.matches.map(m => m.id === id ? { ...m, status: "rejected" } : m),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      generateMatchesFor: (userId) => set(state => {
        const target = state.users.find(u => u.id === userId);
        if (!target || target.role !== "applicant" || target.profileStatus !== "approved") return state;
        const candidates = state.users.filter(u =>
          u.id !== userId && u.role === "applicant" && u.profileStatus === "approved" && u.gender !== target.gender
        );
        const existingPairs = new Set(state.matches.map(m => [m.userAId, m.userBId].sort().join("|")));
        const newMatches: Match[] = [];
        candidates.forEach(c => {
          const key = [userId, c.id].sort().join("|");
          if (existingPairs.has(key)) return;
          const { total, breakdown } = computeMatchScore(target, c, state.config.weights);
          if (total < 40) return;
          newMatches.push({
            id: `m${Date.now()}-${c.id}`,
            userAId: target.id,
            userBId: c.id,
            score: total,
            breakdown,
            status: "suggested",
            generatedAt: new Date().toISOString(),
          });
        });
        return { matches: [...state.matches, ...newMatches] };
      }),

      approveMatch: (id, staffId) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "approve_match", resourceType: "match", resourceId: id, reason: "Approved by staff", timestamp: new Date().toISOString() };
        return {
          matches: state.matches.map(m => m.id === id ? { ...m, status: "approved" } : m),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      approveProfile: (id, staffId) => {
        set(state => {
          const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "approve_profile", resourceType: "profile", resourceId: id, reason: "Profile meets guidelines", timestamp: new Date().toISOString() };
          return {
            users: state.users.map(u => u.id === id ? { ...u, profileStatus: "approved" } : u),
            auditLogs: [...state.auditLogs, log]
          };
        });
        get().generateMatchesFor(id);
      },

      rejectProfile: (id, staffId, reason) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "reject_profile", resourceType: "profile", resourceId: id, reason, timestamp: new Date().toISOString() };
        return {
          users: state.users.map(u => u.id === id ? { ...u, profileStatus: "rejected" } : u),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      register: (user) => set(state => ({
        users: [...state.users, user],
        currentUser: user
      })),

      flagMessage: (id, staffId, reason) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "flag_message", resourceType: "message", resourceId: id, reason, timestamp: new Date().toISOString() };
        return {
          messages: state.messages.map(m => m.id === id ? { ...m, status: "rejected" } : m),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      requestCounselling: (userId, type, topic) => set(state => ({
        counselling: [...state.counselling, {
          id: `c${Date.now()}`,
          userId,
          type,
          topic,
          status: "pending",
          createdAt: new Date().toISOString()
        }]
      })),

      assignCounselling: (id, staffId) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "assign_counselling", resourceType: "counselling", resourceId: id, reason: "Assigned to staff", timestamp: new Date().toISOString() };
        return {
          counselling: state.counselling.map(c => c.id === id ? { ...c, status: "assigned" } : c),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      completeCounselling: (id, staffId) => set(state => {
        const log: AuditLog = { id: `al${Date.now()}`, staffId, action: "complete_counselling", resourceType: "counselling", resourceId: id, reason: "Session completed", timestamp: new Date().toISOString() };
        return {
          counselling: state.counselling.map(c => c.id === id ? { ...c, status: "completed" } : c),
          auditLogs: [...state.auditLogs, log]
        };
      }),

      updateConfig: (newConfig) => set(state => ({
        config: { ...state.config, ...newConfig }
      })),
    }),
    {
      name: 'nikah-network-storage-v2',
    }
  )
);
