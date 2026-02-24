import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("Skipping admin users missing routes contract test: DATABASE_URL is not configured");
  process.exit(0);
}

const testPort = 4311;
const baseUrl = `http://127.0.0.1:${testPort}`;

async function createPrismaClient() {
  const prismaModule = (await import("@prisma/client")) as {
    PrismaClient?: new () => { [key: string]: unknown };
    default?: { PrismaClient?: new () => { [key: string]: unknown } };
  };

  const PrismaClientCtor = prismaModule.PrismaClient ?? prismaModule.default?.PrismaClient;
  if (!PrismaClientCtor) {
    throw new Error("PrismaClient unavailable. Run npm run db:generate --prefix apps/api first.");
  }

  return new PrismaClientCtor() as any;
}

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

function assertNotMissingRoute(status: number, path: string) {
  assert.notEqual(status, 404, `Expected ${path} to exist, but got 404`);
}

async function main() {
  const prisma = await createPrismaClient();
  const marker = `contract-admin-routes-${Date.now()}`;
  const adminEmail = `${marker}-admin@example.com`;
  const targetEmail = `${marker}-target@example.com`;
  const password = "ContractTest123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      provider: "email",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  const targetUser = await prisma.user.create({
    data: {
      email: targetEmail,
      passwordHash,
      provider: "email",
      role: "USER",
      plan: "FREE",
      aiTokenBalance: 0,
      aiTokenMonthlyAllowance: 0,
      emailVerifiedAt: new Date(),
    },
  });

  const server = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: "apps/api",
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

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    assert.equal(loginRes.status, 200, `Expected login status 200, got ${loginRes.status}. Logs:\n${serverLogs}`);

    const cookieHeader = loginRes.headers.get("set-cookie");
    assert.ok(cookieHeader, "Expected auth cookie from /auth/login");

    const planRes = await fetch(`${baseUrl}/admin/users/${targetUser.id}/plan`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ subscriptionPlan: "PRO" }),
    });
    assertNotMissingRoute(planRes.status, "/admin/users/:id/plan");
    assert.equal(planRes.status, 200);

    const tokensRes = await fetch(`${baseUrl}/admin/users/${targetUser.id}/tokens`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ aiTokenBalance: 9, aiTokenMonthlyAllowance: 20 }),
    });
    assertNotMissingRoute(tokensRes.status, "/admin/users/:id/tokens");
    assert.equal(tokensRes.status, 200);

    const tokensAllowanceRes = await fetch(`${baseUrl}/admin/users/${targetUser.id}/tokens-allowance`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ aiTokenMonthlyAllowance: 30 }),
    });
    assertNotMissingRoute(tokensAllowanceRes.status, "/admin/users/:id/tokens-allowance");
    assert.equal(tokensAllowanceRes.status, 200);

    const tokensAddRes = await fetch(`${baseUrl}/admin/users/${targetUser.id}/tokens/add`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ amount: 5 }),
    });
    assertNotMissingRoute(tokensAddRes.status, "/admin/users/:id/tokens/add");
    assert.equal(tokensAddRes.status, 200);

    const tokensBalanceRes = await fetch(`${baseUrl}/admin/users/${targetUser.id}/tokens/balance`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ aiTokenBalance: 11 }),
    });
    assertNotMissingRoute(tokensBalanceRes.status, "/admin/users/:id/tokens/balance");
    assert.equal(tokensBalanceRes.status, 200);
  } finally {
    server.kill("SIGTERM");
    await sleep(500);
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, targetUser.id] } } });
    await prisma.$disconnect();
  }

  console.log("admin users missing routes contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
