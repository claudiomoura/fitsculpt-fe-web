import assert from "node:assert/strict";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";
import { startContractServer } from "./contractTestServer.js";

let baseUrl = "";
const prisma = new PrismaClient();

async function allocatePort(): Promise<number> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate test port")));
        return;
      }
      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}

function uniqueValue(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type RegisteredUser = { id: string; email: string };

async function registerUser(email: string, password: string, name: string): Promise<RegisteredUser> {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name,
      promoCode: "FitSculpt-100%",
    }),
  });

  assert.equal(response.status, 201, `Expected register to return 201 for ${email}`);
  return (await response.json()) as RegisteredUser;
}

function parseAuthCookie(setCookie: string | null) {
  assert.ok(setCookie, "Expected fs_token cookie in auth response");
  return setCookie!.split(";")[0]!;
}

function extractToken(cookie: string) {
  const [name, value] = cookie.split("=");
  assert.equal(name, "fs_token", "Expected fs_token cookie name");
  assert.ok(value, "Expected non-empty jwt token in fs_token cookie");
  return value;
}

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  assert.ok(parts.length >= 2, "Expected JWT to contain payload part");
  const payload = Buffer.from(parts[1]!, "base64url").toString("utf8");
  const parsed = JSON.parse(payload) as Record<string, unknown>;
  return parsed;
}

async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200, `Expected login to return 200 for ${email}`);
  const cookie = parseAuthCookie(response.headers.get("set-cookie"));
  return {
    cookie,
    payload: decodeJwtPayload(extractToken(cookie)),
  };
}

async function fetchAuthMe(cookie: string) {
  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: { cookie },
  });
  assert.equal(response.status, 200, "Expected /auth/me to succeed");
  return (await response.json()) as {
    role: string;
    gymRole: string;
    isTrainer: boolean;
  };
}

async function main() {
  const testPort = await allocatePort();
  baseUrl = `http://127.0.0.1:${testPort}`;
  const password = "Passw0rd!123";
  const bootstrapAdminEmail = `${uniqueValue("bootstrap_admin")}@example.com`;
  const normalUserEmail = `${uniqueValue("normal_user")}@example.com`;
  const trainerUserEmail = `${uniqueValue("trainer_user")}@example.com`;

  const server = startContractServer({
    port: testPort,
    bootstrapAdminEmails: bootstrapAdminEmail,
  });

  try {
    await server.waitForReady();

    const bootstrapAdmin = await registerUser(bootstrapAdminEmail, password, "Bootstrap Admin");
    const normalUser = await registerUser(normalUserEmail, password, "Normal User");
    const trainerUser = await registerUser(trainerUserEmail, password, "Trainer User");

    await prisma.user.updateMany({
      where: { id: { in: [bootstrapAdmin.id, normalUser.id, trainerUser.id] } },
      data: { emailVerifiedAt: new Date() },
    });

    const trainerGym = await prisma.gym.create({
      data: {
        name: "Role Source Test Gym",
        code: uniqueValue("gym").slice(0, 20).toUpperCase(),
        activationCode: uniqueValue("activation").slice(0, 20).toUpperCase(),
      },
    });

    await prisma.gymMembership.create({
      data: {
        userId: trainerUser.id,
        gymId: trainerGym.id,
        role: "TRAINER",
        status: "ACTIVE",
      },
    });

    const bootstrapAdminLogin = await login(bootstrapAdminEmail, password);
    assert.equal(bootstrapAdminLogin.payload.role, "ADMIN");

    const bootstrapAuthMe = await fetchAuthMe(bootstrapAdminLogin.cookie);
    assert.equal(bootstrapAuthMe.role, "ADMIN");

    const bootstrapAdminRoute = await fetch(`${baseUrl}/admin/users`, {
      headers: { cookie: bootstrapAdminLogin.cookie },
    });
    assert.equal(
      bootstrapAdminRoute.status,
      200,
      `Expected bootstrap admin to pass API admin guard. Logs:\n${server.getLogs()}`,
    );

    const normalUserLogin = await login(normalUserEmail, password);
    assert.equal(normalUserLogin.payload.role, "USER");

    const normalAuthMe = await fetchAuthMe(normalUserLogin.cookie);
    assert.equal(normalAuthMe.role, "USER");

    const normalAdminRoute = await fetch(`${baseUrl}/admin/users`, {
      headers: { cookie: normalUserLogin.cookie },
    });
    assert.equal(normalAdminRoute.status, 403, "Expected normal user to be denied admin endpoint");

    const trainerLogin = await login(trainerUserEmail, password);
    assert.equal(trainerLogin.payload.role, "USER");

    const trainerAuthMe = await fetchAuthMe(trainerLogin.cookie);
    assert.equal(trainerAuthMe.role, "USER");
    assert.equal(trainerAuthMe.gymRole, "TRAINER");
    assert.equal(trainerAuthMe.isTrainer, true);
  } finally {
    await Promise.allSettled([server.stop(), prisma.$disconnect()]);
  }

  console.log("auth role source contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
