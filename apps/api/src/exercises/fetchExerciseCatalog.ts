import { Prisma, type PrismaClient } from "@prisma/client";
import type { ExerciseCatalogItem } from "../ai/trainingPlanExerciseResolution.js";

function hasExerciseClient(prisma: PrismaClient) {
  return typeof (prisma as PrismaClient & { exercise?: unknown }).exercise !== "undefined";
}

export async function fetchExerciseCatalog(prisma: PrismaClient): Promise<ExerciseCatalogItem[]> {
  if (hasExerciseClient(prisma)) {
    return prisma.exercise.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        equipment: true,
        mainMuscleGroup: true,
      },
      orderBy: { name: "asc" },
    });
  }

  return prisma.$queryRaw<ExerciseCatalogItem[]>(Prisma.sql`
    SELECT "id", "name", "imageUrl", "equipment", "mainMuscleGroup"
    FROM "Exercise"
    ORDER BY "name" ASC
  `);
}
