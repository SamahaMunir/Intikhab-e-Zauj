import app from "./app";
import { logger } from "./lib/logger";
import { connectToDatabase, closeDatabaseConnection } from "./db/connection";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    await connectToDatabase();
  } catch (err) {
    logger.warn({ err }, "MongoDB connection failed at startup; continuing without database");
  }

  const server = app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });

  async function shutdown(signal: string) {
    logger.info({ signal }, "Shutdown signal received");
    const forceExitTimer = setTimeout(() => {
      logger.warn("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    server.close(async () => {
      await closeDatabaseConnection();
      clearTimeout(forceExitTimer);
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
