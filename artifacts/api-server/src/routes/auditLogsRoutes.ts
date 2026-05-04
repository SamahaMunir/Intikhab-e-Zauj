import { Router, Request, Response } from "express";
import { getAuditLogs, getResourceAuditLogs } from "../db/auditLogs";

const router = Router();

/**
 * GET /api/staff/audit-logs
 * Fetch all audit logs (staff only)
 * Query params: action, resourceType, resourceId, actorEmail, limit, skip
 */
router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const {
      action,
      resourceType,
      resourceId,
      actorEmail,
      limit = "100",
      skip = "0",
    } = req.query;

    const filters: any = {};
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (actorEmail) filters.actorEmail = actorEmail;

    const { logs, total } = await getAuditLogs(
      filters,
      parseInt(limit as string, 10),
      parseInt(skip as string, 10)
    );

    res.json({
      success: true,
      data: logs,
      total,
      limit: parseInt(limit as string, 10),
      skip: parseInt(skip as string, 10),
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch audit logs",
    });
  }
});

/**
 * GET /api/staff/audit-logs/:resourceType/:resourceId
 * Fetch logs for a specific resource
 */
router.get(
  "/audit-logs/:resourceType/:resourceId",
  async (
    req: Request<{ resourceType: string; resourceId: string }>,
    res: Response
  ) => {
    try {
      const { resourceType, resourceId } = req.params;

      const logs = await getResourceAuditLogs(resourceType, resourceId);

      res.json({
        success: true,
        data: logs,
        resourceType,
        resourceId,
      });
    } catch (error) {
      console.error("Error fetching resource audit logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch resource audit logs",
      });
    }
  }
);

export default router;