import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { upsertExerciseRecord } from "./exercises/service.js";

const prisma = new PrismaClient();

type SeedExercise = {
  name: string;
  mainMuscleGroup: string;
  secondaryMuscleGroups: string[];
  equipment?: string | null;
  description?: string | null;
  technique?: string | null;
  tips?: string | null;
  isUserCreated?: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, "data", "exercises.seed.json");

async function run() {
  const raw = await readFile(seedPath, "utf-8");
  const exercises = JSON.parse(raw) as SeedExercise[];

  let processed = 0;
  for (const exercise of exercises) {
    await upsertExerciseRecord(prisma, exercise.name, {
      equipment: exercise.equipment ?? null,
      description: exercise.description ?? null,
      mainMuscleGroup: exercise.mainMuscleGroup,
      secondaryMuscleGroups: exercise.secondaryMuscleGroups,
      technique: exercise.technique ?? null,
      tips: exercise.tips ?? null,
    });
    processed += 1;
  }

  console.log(`Seeded ${processed} exercises.`);
}

try {
  await run();
} finally {
  await prisma.$disconnect();
}
