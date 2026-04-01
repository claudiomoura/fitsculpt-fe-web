import { Prisma, type PrismaClient } from "@prisma/client";
import type { ExerciseCatalogItem } from "../ai/trainingPlanExerciseResolution.js";

// In-memory cache for the exercise catalog. Exercises rarely change, so we
// cache for 10 minutes to avoid hitting the DB on every plan view / AI call.
let cachedCatalog: ExerciseCatalogItem[] | null = null;
let cacheTimestamp = 0;
const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function hasExerciseClient(prisma: PrismaClient) {
  return typeof (prisma as PrismaClient & { exercise?: unknown }).exercise !== "undefined";
}

export async function fetchExerciseCatalog(prisma: PrismaClient): Promise<ExerciseCatalogItem[]> {
  const now = Date.now();
  if (cachedCatalog && now - cacheTimestamp < CATALOG_CACHE_TTL_MS) {
    return cachedCatalog;
  }

  let catalog: ExerciseCatalogItem[];
  if (hasExerciseClient(prisma)) {
    catalog = await prisma.exercise.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        equipment: true,
        mainMuscleGroup: true,
      },
      orderBy: { name: "asc" },
      take: 500, // safety ceiling — prevents unbounded growth
    });
  } else {
    catalog = await prisma.$queryRaw<ExerciseCatalogItem[]>(Prisma.sql`
      SELECT "id", "name", "imageUrl", "equipment", "mainMuscleGroup"
      FROM "Exercise"
      ORDER BY "name" ASC
      LIMIT 500
    `);
  }

  cachedCatalog = catalog;
  cacheTimestamp = now;
  return catalog;
}
