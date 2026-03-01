import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startContractServer } from "./contractTestServer.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("Skipping exercises imageUrl contract test: DATABASE_URL is not configured");
  process.exit(0);
}

const testPort = 4310;
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

const now = Date.now();
const marker = `contract-imageurl-${now}`;
const email = `${marker}@example.com`;
const password = "ContractTest123!";
const exerciseWithImageSlug = `${marker}-with-image`;
const exerciseWithImageName = `Contract ImageUrl With Image ${now}`;
const seededImageUrl = `https://cdn.example.com/${marker}.jpg`;

async function main() {
  const prisma = await createPrismaClient();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      provider: "email",
      role: "USER",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.exercise.upsert({
    where: { slug: exerciseWithImageSlug },
    create: {
      slug: exerciseWithImageSlug,
      name: exerciseWithImageName,
      source: "contract-test",
      sourceId: marker,
      mainMuscleGroup: "Legs",
      secondaryMuscleGroups: [],
      imageUrl: seededImageUrl,
      imageUrls: [],
      isUserCreated: false,
    },
    update: {
      name: exerciseWithImageName,
      imageUrl: seededImageUrl,
      imageUrls: [],
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

    const exercisesRes = await fetch(`${baseUrl}/exercises?q=${encodeURIComponent(exerciseWithImageName)}`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(exercisesRes.status, 200, `Expected /exercises status 200, got ${exercisesRes.status}`);

    const payload = (await exercisesRes.json()) as { items?: Array<{ name?: string; imageUrl?: string | null }> };

    const itemsWithImage = (payload.items ?? []).filter(
      (item) => item.name === exerciseWithImageName && typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0
    );

    assert.ok(
      itemsWithImage.length >= 1,
      "Expected GET /exercises to return at least one matching exercise with a non-empty imageUrl"
    );
  } finally {
    await Promise.allSettled([
      server.stop(),
      prisma.exercise.deleteMany({ where: { slug: exerciseWithImageSlug } }),
      prisma.user.deleteMany({ where: { email } }),
      prisma.$disconnect(),
    ]);
  }

  console.log("exercises imageUrl contract test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
