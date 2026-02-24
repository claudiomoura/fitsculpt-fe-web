import { PrismaClient } from "@prisma/client";
import { normalizeExerciseName } from "../src/utils/normalizeExerciseName.js";

const prisma = new PrismaClient();

function normalizeExerciseLookupKey(name: string) {
  return normalizeExerciseName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseDryRunFlag() {
  return process.argv.includes("--dry-run");
}

async function main() {
  const dryRun = parseDryRunFlag();

  const [libraryExercises, pendingTrainingExercises, beforeNullCount] = await Promise.all([
    prisma.exercise.findMany({
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.trainingExercise.findMany({
      where: { exerciseId: null },
      select: { id: true, name: true },
    }),
    prisma.trainingExercise.count({ where: { exerciseId: null } }),
  ]);

  const byNormalizedName = new Map<string, string>();
  let duplicateLibraryNameKeys = 0;

  for (const exercise of libraryExercises) {
    const key = normalizeExerciseLookupKey(exercise.name);
    if (byNormalizedName.has(key)) {
      duplicateLibraryNameKeys += 1;
      continue;
    }
    byNormalizedName.set(key, exercise.id);
  }

  const matches = pendingTrainingExercises
    .map((trainingExercise) => {
      const key = normalizeExerciseLookupKey(trainingExercise.name);
      return {
        id: trainingExercise.id,
        resolvedExerciseId: byNormalizedName.get(key) ?? null,
      };
    })
    .filter((item): item is { id: string; resolvedExerciseId: string } => Boolean(item.resolvedExerciseId));

  console.log("[backfill] TrainingExercise.exerciseId");
  console.log(`- mode: ${dryRun ? "dry-run" : "apply"}`);
  console.log(`- library exercises: ${libraryExercises.length}`);
  console.log(`- duplicate normalized library keys skipped: ${duplicateLibraryNameKeys}`);
  console.log(`- pending rows before: ${beforeNullCount}`);
  console.log(`- matched rows: ${matches.length}`);
  console.log(`- unmatched rows (left null): ${beforeNullCount - matches.length}`);

  let updated = 0;
  let failed = 0;

  if (!dryRun) {
    for (const match of matches) {
      try {
        const result = await prisma.trainingExercise.updateMany({
          where: {
            id: match.id,
            exerciseId: null,
          },
          data: {
            exerciseId: match.resolvedExerciseId,
          },
        });
        updated += result.count;
      } catch (error) {
        failed += 1;
        console.error(`[backfill] failed to update TrainingExercise ${match.id}:`, error);
      }
    }
  }

  const afterNullCount = dryRun ? beforeNullCount : await prisma.trainingExercise.count({ where: { exerciseId: null } });
  const afterFilledCount = dryRun
    ? await prisma.trainingExercise.count({ where: { exerciseId: { not: null } } })
    : await prisma.trainingExercise.count({ where: { exerciseId: { not: null } } });

  console.log(`- updated rows: ${updated}`);
  console.log(`- failed updates: ${failed}`);
  console.log(`- pending rows after: ${afterNullCount}`);
  console.log(`- rows with exerciseId after: ${afterFilledCount}`);
}

main()
  .catch((error) => {
    console.error("[backfill] fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
