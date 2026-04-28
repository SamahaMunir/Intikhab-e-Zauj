import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getMongoClient } from "../db/connection";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    const client = await getMongoClient();
    const db = client.db("intikhab_dev");
    await db.admin().ping();
    
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json({
      ...data,
      database: "connected",
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: String(error),
      timestamp: new Date(),
    });
  }
});

export default router;
