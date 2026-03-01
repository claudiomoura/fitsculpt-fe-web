import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { apiRoot } from "./testPaths.js";

declare global {
  // eslint-disable-next-line no-var
  var __fsCiOpenHandlesDiagnosticsInstalled: boolean | undefined;
}

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

function formatHandle(handle: unknown) {
  if (!handle || typeof handle !== "object") {
    return String(handle);
  }

  const typedHandle = handle as {
    constructor?: { name?: string };
    hasRef?: () => boolean;
    fd?: number;
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
    destroyed?: boolean;
    connecting?: boolean;
    pending?: boolean;
    spawnfile?: string;
    pid?: number;
  };

  const handleName = typedHandle.constructor?.name ?? "UnknownHandle";
  const details: Array<string> = [];

  if (typeof typedHandle.hasRef === "function") {
    details.push(`hasRef=${String(typedHandle.hasRef())}`);
  }
  if (typeof typedHandle.fd === "number") {
    details.push(`fd=${typedHandle.fd}`);
  }
  if (typeof typedHandle.localPort === "number") {
    details.push(`local=${typedHandle.localAddress ?? "?"}:${typedHandle.localPort}`);
  }
  if (typeof typedHandle.remotePort === "number") {
    details.push(`remote=${typedHandle.remoteAddress ?? "?"}:${typedHandle.remotePort}`);
  }
  if (typeof typedHandle.destroyed === "boolean") {
    details.push(`destroyed=${String(typedHandle.destroyed)}`);
  }
  if (typeof typedHandle.connecting === "boolean") {
    details.push(`connecting=${String(typedHandle.connecting)}`);
  }
  if (typeof typedHandle.pending === "boolean") {
    details.push(`pending=${String(typedHandle.pending)}`);
  }
  if (typedHandle.spawnfile) {
    details.push(`spawnfile=${typedHandle.spawnfile}`);
  }
  if (typeof typedHandle.pid === "number") {
    details.push(`pid=${typedHandle.pid}`);
  }

  return details.length > 0 ? `${handleName}(${details.join(", ")})` : handleName;
}

function installCiOpenHandlesDiagnostics() {
  if (process.env.CI !== "true") {
    return;
  }

  if (globalThis.__fsCiOpenHandlesDiagnosticsInstalled) {
    return;
  }
  globalThis.__fsCiOpenHandlesDiagnosticsInstalled = true;

  const dumpOpenResources = (reason: string) => {
    const withInternals = process as NodeJS.Process & {
      _getActiveHandles?: () => unknown[];
      _getActiveRequests?: () => unknown[];
    };

    const activeHandles = withInternals._getActiveHandles?.() ?? [];
    const activeRequests = withInternals._getActiveRequests?.() ?? [];

    if (activeHandles.length === 0 && activeRequests.length === 0) {
      return;
    }

    console.error(`[ci-open-handles] ${reason}`);

    if (activeHandles.length > 0) {
      console.error(`[ci-open-handles] Active handles (${activeHandles.length}):`);
      for (const [index, handle] of activeHandles.entries()) {
        console.error(`[ci-open-handles]   [${index}] ${formatHandle(handle)}`);
      }
    }

    if (activeRequests.length > 0) {
      console.error(`[ci-open-handles] Active requests (${activeRequests.length}):`);
      for (const [index, request] of activeRequests.entries()) {
        const requestName =
          typeof request === "object" && request !== null && "constructor" in request
            ? ((request as { constructor?: { name?: string } }).constructor?.name ?? "UnknownRequest")
            : String(request);
        console.error(`[ci-open-handles]   [${index}] ${requestName}`);
      }
    }
  };

  process.on("SIGTERM", () => {
    dumpOpenResources("SIGTERM received while tests are running");
    process.exitCode = process.exitCode ?? 143;
  });

  process.on("SIGINT", () => {
    dumpOpenResources("SIGINT received while tests are running");
    process.exitCode = process.exitCode ?? 130;
  });

  const watchdog = setInterval(() => {
    dumpOpenResources("Periodic watchdog dump (process still alive)");
  }, 30_000);
  watchdog.unref();
}

installCiOpenHandlesDiagnostics();

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
  const server = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: apiRoot,
    env: getServerEnv(options.port, options.bootstrapAdminEmails),
    stdio: ["ignore", "pipe", "pipe"],
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
      const requestTimeout = setTimeout(() => controller.abort(), 1_500);

      try {
        const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
        if (response.ok) {
          clearTimeout(requestTimeout);
          return;
        }
        lastError = `GET /health returned ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      } finally {
        clearTimeout(requestTimeout);
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

    if (server.exitCode !== null || server.signalCode !== null) {
      return;
    }

    server.kill("SIGTERM");

    try {
      await waitForProcessExit(server, 5_000);
    } catch {
      server.kill("SIGKILL");
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
