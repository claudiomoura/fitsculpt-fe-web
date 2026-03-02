import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startContractServer } from "./contractTestServer.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("Skipping training plans create contract test: DATABASE_URL is not configured");
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

async function main() {
  const prisma = await createPrismaClient();
  const marker = `contract-training-plans-${Date.now()}`;
  const email = `${marker}@example.com`;
  const password = "ContractTest123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const createdUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      provider: "email",
      role: "USER",
      emailVerifiedAt: new Date(),
    },
  });

  const server = startContractServer({ port: testPort });

  try {
    await server.waitForReady();

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginRes.status, 200, `Expected login status 200, got ${loginRes.status}. Logs:\n${server.getLogs()}`);

    const cookieHeader = loginRes.headers.get("set-cookie");
    assert.ok(cookieHeader, "Expected auth cookie from /auth/login");

    const validPayload = {
      title: `Plan ${marker}`,
      goal: "general_fitness",
      level: "beginner",
      focus: "full_body",
      equipment: "gym",
      daysPerWeek: 3,
      startDate: "2026-01-01",
      daysCount: 7,
    };

    const createRes = await fetch(`${baseUrl}/training-plans`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify(validPayload),
    });
    assert.equal(createRes.status, 201, `Expected 201 for valid create, got ${createRes.status}`);

    const conflictRes = await fetch(`${baseUrl}/training-plans`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ ...validPayload, title: `${validPayload.title} dup` }),
    });
    assert.equal(conflictRes.status, 409, `Expected 409 for unique conflict, got ${conflictRes.status}`);
    const conflictJson = (await conflictRes.json()) as { error?: string; code?: string; correlationId?: string };
    assert.equal(conflictJson.error, "CONFLICT");
    assert.equal(conflictJson.code, "TRAINING_PLAN_CONFLICT");
    assert.ok(conflictJson.correlationId, "Expected correlationId for conflict response");

    const invalidRes = await fetch(`${baseUrl}/training-plans`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ ...validPayload, title: "" }),
    });
    assert.equal(invalidRes.status, 400, `Expected 400 for validation error, got ${invalidRes.status}`);
    const invalidJson = (await invalidRes.json()) as { error?: string; correlationId?: string };
    assert.equal(invalidJson.error, "VALIDATION_ERROR");
    assert.ok(invalidJson.correlationId, "Expected correlationId for validation response");
  } finally {
    await Promise.allSettled([
      server.stop(),
      prisma.trainingPlan.deleteMany({ where: { userId: createdUser.id } }),
      prisma.user.deleteMany({ where: { email } }),
      prisma.$disconnect(),
    ]);
  }

  console.log("training plans create contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
