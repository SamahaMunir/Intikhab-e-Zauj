import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pingDatabase } from "../db/connection";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (_req, res) => {
  const dbConnected = await pingDatabase();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "healthy" : "unhealthy",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
