import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { apiRoot } from "./testPaths.js";

type AuditRoute = {
  method: string;
  bffPath: string;
  sourceFile: string;
  status?: "matched" | "missing";
};

type AuditReport = {
  focusRoutes?: AuditRoute[];
};

const testPort = 4311;
const baseUrl = `http://127.0.0.1:${testPort}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportPath = path.resolve(__dirname, "../../../../tools/contract-audit/output/report.json");

async function waitForServerReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // retry until timeout
    }
    await sleep(300);
  }
  throw new Error("Server did not become ready in time");
}

function runtimePathFromAuditPath(auditPath: string): string {
  return auditPath.replace(":id", "contract-test-user-id");
}

function getAdminUsersAuditRoutes(report: AuditReport): AuditRoute[] {
  const focusRoutes = report.focusRoutes ?? [];
  return focusRoutes.filter((route) => route.bffPath.startsWith("/api/admin/users/:id/"));
}

function getPlanAndTokensRoutes(routes: AuditRoute[]): AuditRoute[] {
  return routes.filter((route) => /\/(plan|tokens(?:\/|$|-))/.test(route.bffPath));
}

async function main() {
  const rawReport = await readFile(reportPath, "utf8");
  const report = JSON.parse(rawReport) as AuditReport;
  const auditedRoutes = getAdminUsersAuditRoutes(report);

  assert.ok(auditedRoutes.length > 0, "Expected admin users audited routes from PR-01 snapshot");

  const planAndTokensRoutes = getPlanAndTokensRoutes(auditedRoutes);
  assert.ok(planAndTokensRoutes.length > 0, "Expected plan/tokens routes in PR-01 snapshot");

  const server = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: apiRoot,
    env: {
      ...process.env,
      PORT: String(testPort),
      HOST: "127.0.0.1",
      NODE_ENV: "test",
      ADMIN_EMAIL_SEED: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverLogs = "";
  server.stdout.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });

  try {
    await waitForServerReady();

    const results = await Promise.all(
      auditedRoutes.map(async (route) => {
        const runtimePath = runtimePathFromAuditPath(route.bffPath.replace("/api", ""));
        const response = await fetch(`${baseUrl}${runtimePath}`, { method: route.method });
        return {
          method: route.method,
          bffPath: route.bffPath,
          status: response.status,
          existsInBackend: response.status !== 404,
        };
      })
    );

    const missing = results.filter((route) => !route.existsInBackend);
    assert.equal(
      missing.length,
      0,
      `Found BFF admin/users routes without backend implementation:\n${missing
        .map((route) => `${route.method} ${route.bffPath} -> HTTP ${route.status}`)
        .join("\n")}\nLogs:\n${serverLogs}`
    );

    const planAndTokensResults = results.filter((route) => /\/(plan|tokens(?:\/|$|-))/.test(route.bffPath));
    const existsInBackend = new Set(planAndTokensResults.map((route) => route.existsInBackend));

    assert.equal(
      existsInBackend.size,
      1,
      `Expected plan/tokens routes to be aligned (all implemented or all missing). Results:\n${planAndTokensResults
        .map((route) => `${route.method} ${route.bffPath} -> HTTP ${route.status}`)
        .join("\n")}`
    );
  } finally {
    server.kill("SIGTERM");
    await sleep(500);
  }

  console.log("admin users snapshot contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
