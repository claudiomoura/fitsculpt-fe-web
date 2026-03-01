import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { apiRoot } from "./testPaths.js";

type StartContractServerOptions = {
  port: number;
  bootstrapAdminEmails?: string;
};

type StartedContractServer = {
  process: ChildProcessWithoutNullStreams;
  baseUrl: string;
  waitForReady: () => Promise<void>;
  stop: () => Promise<void>;
  getLogs: () => string;
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/fitsculpt?schema=public";
}

function getServerEnv(port: number, bootstrapAdminEmails?: string) {
  const databaseUrl = getDatabaseUrl();

  return {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    NODE_ENV: "test",
    ADMIN_EMAIL_SEED: "",
    BOOTSTRAP_ADMIN_EMAILS: bootstrapAdminEmails ?? "",
    DATABASE_URL: databaseUrl,
    DIRECT_URL: process.env.DIRECT_URL ?? databaseUrl,
    JWT_SECRET: process.env.JWT_SECRET ?? "contract-jwt-secret-32-chars-minimum",
    COOKIE_SECRET: process.env.COOKIE_SECRET ?? "contract-cookie-secret-32chars",
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://127.0.0.1:3000",
    APP_BASE_URL: process.env.APP_BASE_URL ?? "http://127.0.0.1:3000",
    ALLOW_SEED: process.env.ALLOW_SEED ?? "1",
    ...(process.env.CI === "true" ? { SKIP_DB_PREFLIGHT: "1" } : {}),
  };
}

async function waitForProcessExit(server: ChildProcessWithoutNullStreams, timeoutMs: number) {
  if (server.exitCode !== null || server.signalCode !== null) {
    return;
  }

  await Promise.race([
    once(server, "exit"),
    sleep(timeoutMs).then(() => {
      throw new Error(`Timed out waiting for server process to exit after ${timeoutMs}ms`);
    }),
  ]);
}

export function startContractServer(options: StartContractServerOptions): StartedContractServer {
  const baseUrl = `http://127.0.0.1:${options.port}`;
  const activeTimers = new Set<NodeJS.Timeout>();

  const startTimer = (callback: () => void, timeoutMs: number) => {
    const timer = setTimeout(() => {
      activeTimers.delete(timer);
      callback();
    }, timeoutMs);

    activeTimers.add(timer);
    return timer;
  };

  const clearTimer = (timer: NodeJS.Timeout) => {
    if (activeTimers.delete(timer)) {
      clearTimeout(timer);
      return;
    }

    clearTimeout(timer);
  };

  const clearAllTimers = () => {
    for (const timer of activeTimers) {
      clearTimeout(timer);
    }
    activeTimers.clear();
  };

  const server = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: apiRoot,
    env: getServerEnv(options.port, options.bootstrapAdminEmails),
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  let serverLogs = "";
  let exitCode: number | null = null;
  let exitSignal: NodeJS.Signals | null = null;
  let stopped = false;

  server.stdout.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  server.on("exit", (code, signal) => {
    exitCode = code;
    exitSignal = signal;
  });

  async function waitForReady() {
    const timeoutMs = process.env.CI === "true" ? 90_000 : 30_000;
    const deadline = Date.now() + timeoutMs;
    let lastError: string | null = null;

    while (Date.now() < deadline) {
      if (exitCode !== null || exitSignal !== null) {
        throw new Error(
          `Server exited before readiness check passed (code=${String(exitCode)}, signal=${String(
            exitSignal
          )}). Logs:\n${serverLogs}`
        );
      }

      const controller = new AbortController();
      const requestTimeout = startTimer(() => controller.abort(), 1_500);

      try {
        const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
        if (response.ok) {
          clearTimer(requestTimeout);
          return;
        }
        lastError = `GET /health returned ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      } finally {
        clearTimer(requestTimeout);
      }

      await sleep(250);
    }

    throw new Error(`Server did not become ready in time. Last error: ${lastError ?? "unknown"}. Logs:\n${serverLogs}`);
  }

  async function stop() {
    if (stopped) {
      return;
    }
    stopped = true;
    clearAllTimers();

    if (server.exitCode !== null || server.signalCode !== null) {
      return;
    }

    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }

    try {
      await waitForProcessExit(server, 5_000);
    } catch {
      try {
        process.kill(-server.pid!, "SIGKILL");
      } catch {
        server.kill("SIGKILL");
      }
      await waitForProcessExit(server, 5_000);
    }
  }

  return {
    process: server,
    baseUrl,
    waitForReady,
    stop,
    getLogs: () => serverLogs,
  };
}
