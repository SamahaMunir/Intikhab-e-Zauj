import { MongoClient, Db } from "mongodb";

export interface AuditLog {
  _id?: string;
  actorId: string;
  actorEmail: string;
  actorRole: "staff" | "admin";
  action: string; // "approve_profile", "reject_proposal", etc.
  resourceType: string; // "profile", "proposal", "message", "match", etc.
  resourceId: string;
  reason?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

let auditLogsCollection: any;

export async function initAuditLogs(db: Db) {
  auditLogsCollection = db.collection("audit_logs");
  
  // Create indexes for faster queries
  await auditLogsCollection.createIndex({ createdAt: -1 });
  await auditLogsCollection.createIndex({ actorEmail: 1 });
  await auditLogsCollection.createIndex({ resourceType: 1, resourceId: 1 });
  await auditLogsCollection.createIndex({ action: 1 });
  
  console.log("✓ Audit logs collection initialized with indexes");
}

/**
 * Log an admin/staff action to the audit trail
 */
export async function logAudit(
  actorEmail: string,
  actorId: string,
  actorRole: "staff" | "admin",
  action: string,
  resourceType: string,
  resourceId: string,
  reason?: string,
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  if (!auditLogsCollection) {
    console.warn("Audit logs collection not initialized");
    return;
  }

  const log: AuditLog = {
    actorId,
    actorEmail,
    actorRole,
    action,
    resourceType,
    resourceId,
    reason,
    metadata,
    ip,
    userAgent,
    createdAt: new Date(),
  };

  try {
    await auditLogsCollection.insertOne(log);
  } catch (error) {
    console.error("Failed to log audit entry:", error);
    // Don't throw — logging failure shouldn't break the main action
  }
}

/**
 * Fetch audit logs with optional filters
 */
export async function getAuditLogs(
  filters: {
    actorEmail?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
  limit: number = 100,
  skip: number = 0
): Promise<{ logs: AuditLog[]; total: number }> {
  if (!auditLogsCollection) {
    console.warn("Audit logs collection not initialized");
    return { logs: [], total: 0 };
  }

  const query: any = {};

  if (filters.actorEmail) query.actorEmail = filters.actorEmail;
  if (filters.action) query.action = filters.action;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.resourceId) query.resourceId = filters.resourceId;

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  const total = await auditLogsCollection.countDocuments(query);
  const logs = await auditLogsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .toArray();

  return { logs, total };
}

/**
 * Get logs for a specific resource (e.g., all actions on profile "u3")
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string
): Promise<AuditLog[]> {
  if (!auditLogsCollection) return [];

  return auditLogsCollection
    .find({ resourceType, resourceId })
    .sort({ createdAt: -1 })
    .toArray();
}