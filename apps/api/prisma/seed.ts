import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EXERCISE_COUNT = 20;
const PASSWORD_SALT_ROUNDS = 10;

type ExerciseSeed = {
  name: string;
  mainMuscleGroup: string;
  secondaryMuscleGroups: string[];
};

const seedDir = dirname(fileURLToPath(import.meta.url));
const exerciseDataset = JSON.parse(
  readFileSync(join(seedDir, "data/exercises.json"), "utf8")
) as ExerciseSeed[];

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getEnvConfig() {
  return {
    demoAdminEmail: process.env.DEMO_ADMIN_EMAIL ?? "demo-admin@fitsculpt.local",
    demoAdminPassword: process.env.DEMO_ADMIN_PASSWORD ?? "DemoAdmin123!",
    demoGymName: process.env.DEMO_GYM_NAME ?? "FitSculpt Demo Gym",
    demoGymCode: process.env.DEMO_GYM_CODE ?? "DEMO-GYM",
  };
}

function assertSeedAllowed() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allowSeed = process.env.ALLOW_SEED === "1";
  if (nodeEnv === "production" && !allowSeed) {
    throw new Error(
      "Seed blocked in production. Set ALLOW_SEED=1 to run intentionally."
    );
  }
}

async function seedDemoAdmin(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      provider: "email",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      provider: "email",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
      deletedAt: null,
      isBlocked: false,
    },
  });
}

async function seedDemoGym(name: string, code: string) {
  const existingGymByName = await prisma.gym.findFirst({ where: { name } });
  const gymCode = code.trim().toUpperCase();
  const activationCode = `${gymCode}-ACT`;

  if (existingGymByName && existingGymByName.code !== gymCode) {
    await prisma.gym.update({
      where: { id: existingGymByName.id },
      data: { code: gymCode, activationCode },
    });
    return;
  }

  await prisma.gym.upsert({
    where: { code: gymCode },
    create: {
      name,
      code: gymCode,
      activationCode,
    },
    update: {
      name,
      activationCode,
    },
  });
}

async function seedDemoExercises() {
  const demoExercises = exerciseDataset.slice(0, DEMO_EXERCISE_COUNT);
  if (demoExercises.length < DEMO_EXERCISE_COUNT) {
    throw new Error(
      `Expected at least ${DEMO_EXERCISE_COUNT} exercises in dataset, got ${demoExercises.length}`
    );
  }

  for (const exercise of demoExercises) {
    const slug = slugify(exercise.name);
    await prisma.exercise.upsert({
      where: { slug },
      create: {
        slug,
        name: exercise.name,
        mainMuscleGroup: exercise.mainMuscleGroup,
        secondaryMuscleGroups: exercise.secondaryMuscleGroups,
      },
      update: {
        name: exercise.name,
        mainMuscleGroup: exercise.mainMuscleGroup,
        secondaryMuscleGroups: exercise.secondaryMuscleGroups,
      },
    });
  }
}

async function main() {
  assertSeedAllowed();

  const { demoAdminEmail, demoAdminPassword, demoGymName, demoGymCode } = getEnvConfig();

  await seedDemoAdmin(demoAdminEmail, demoAdminPassword);
  await seedDemoGym(demoGymName, demoGymCode);
  await seedDemoExercises();

  const [users, gyms, exercises] = await Promise.all([
    prisma.user.count({ where: { email: demoAdminEmail } }),
    prisma.gym.count({ where: { OR: [{ code: demoGymCode.trim().toUpperCase() }, { name: demoGymName }] } }),
    prisma.exercise.count(),
  ]);

  console.log(`Demo seed complete: users=${users}, gyms=${gyms}, exercises=${exercises}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
