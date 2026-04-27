import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const frontendPort = process.env.FRONTEND_PORT ?? "5173";
const backendPort = process.env.BACKEND_PORT ?? "5000";
const basePath = process.env.BASE_PATH ?? "/";

const portableNodePath =
  process.platform === "win32"
    ? path.join(rootDir, ".tools", "node20", "node-v20.19.5-win-x64", "node.exe")
    : path.join(rootDir, ".tools", "node20", "node-v20.19.5-linux-x64", "bin", "node");

async function resolveRuntimeNode() {
  try {
    await access(portableNodePath, constants.X_OK);
    return portableNodePath;
  } catch {
    return process.execPath;
  }
}

function runOnce(name, command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });

    child.once("error", (err) => {
      reject(new Error(`${name} failed to start: ${err.message}`));
    });

    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${name} exited from signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${name} exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

function spawnLongRunning(command, args, extraEnv = {}) {
  return spawn(command, args, {
    cwd: rootDir,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
}

function terminateChild(child, signal = "SIGTERM") {
  if (!child || child.killed) {
    return;
  }

  try {
    child.kill(signal);
  } catch {
    // ignore teardown errors
  }
}

async function main() {
  const runtimeNode = await resolveRuntimeNode();

  const frontendRequire = createRequire(
    path.join(rootDir, "artifacts", "nikah-network", "package.json"),
  );
  const viteEntryPoint = frontendRequire.resolve("vite");
  const viteCli = path.resolve(
    path.dirname(viteEntryPoint),
    "..",
    "..",
    "bin",
    "vite.js",
  );

  await runOnce(
    "backend build",
    runtimeNode,
    [path.join(rootDir, "artifacts", "api-server", "build.mjs")],
    { NODE_ENV: "development" },
  );

  const backendProcess = spawnLongRunning(
    runtimeNode,
    [
      "--enable-source-maps",
      path.join(rootDir, "artifacts", "api-server", "dist", "index.mjs"),
    ],
    {
      NODE_ENV: "development",
      PORT: backendPort,
    },
  );

  const frontendProcess = spawnLongRunning(
    runtimeNode,
    [
      viteCli,
      "--config",
      path.join(rootDir, "artifacts", "nikah-network", "vite.config.ts"),
      "--host",
      "0.0.0.0",
      "--port",
      frontendPort,
    ],
    {
      NODE_ENV: "development",
      PORT: frontendPort,
      BASE_PATH: basePath,
    },
  );

  let shuttingDown = false;

  const shutdown = (signal = "SIGTERM") => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    terminateChild(backendProcess, signal);
    terminateChild(frontendProcess, signal);

    setTimeout(() => {
      terminateChild(backendProcess, "SIGKILL");
      terminateChild(frontendProcess, "SIGKILL");
    }, 3000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGTERM"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  backendProcess.once("error", (err) => {
    console.error(`backend failed to start: ${err.message}`);
    shutdown("SIGTERM");
    process.exitCode = 1;
  });

  frontendProcess.once("error", (err) => {
    console.error(`frontend failed to start: ${err.message}`);
    shutdown("SIGTERM");
    process.exitCode = 1;
  });

  const onChildExit = (name) => (code, signal) => {
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.error(`${name} exited unexpectedly (${reason}).`);
      shutdown("SIGTERM");
      process.exitCode = code ?? 1;
    }
  };

  backendProcess.once("exit", onChildExit("backend"));
  frontendProcess.once("exit", onChildExit("frontend"));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
