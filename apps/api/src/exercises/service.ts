import crypto from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

export type ExerciseMetadata = {
  equipment?: string | null;
  description?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  mainMuscleGroup?: string;
  secondaryMuscleGroups?: string[];
  technique?: string | null;
  tips?: string | null;
};

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hasExerciseClient(prisma: PrismaClient) {
  return typeof (prisma as PrismaClient & { exercise?: unknown }).exercise !== "undefined";
}

export async function upsertExerciseRecord(prisma: PrismaClient, name: string, metadata?: ExerciseMetadata) {
  const now = new Date();
  const slug = slugifyName(name);

  const mainMuscleGroup =
    metadata?.mainMuscleGroup?.trim() ||
    (metadata?.primaryMuscles && metadata.primaryMuscles.length > 0 ? metadata.primaryMuscles[0] : "General");

  const secondaryMuscleGroups = metadata?.secondaryMuscleGroups ?? metadata?.secondaryMuscles ?? [];

  const payload = {
    slug,
    name,
    mainMuscleGroup,
    secondaryMuscleGroups,
    equipment: metadata?.equipment ?? null,
    description: metadata?.description ?? null,
    technique: metadata?.technique ?? null,
    tips: metadata?.tips ?? null,
    isUserCreated: false,
  };

  if (hasExerciseClient(prisma)) {
    await prisma.exercise.upsert({
      where: { slug },
      create: payload,
      update: {
        name: payload.name,
        mainMuscleGroup: payload.mainMuscleGroup,
        secondaryMuscleGroups: payload.secondaryMuscleGroups,
        equipment: payload.equipment ?? undefined,
        description: payload.description ?? undefined,
        technique: payload.technique ?? undefined,
        tips: payload.tips ?? undefined,
      },
    });
    return;
  }

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "Exercise" (
      "id",
      "slug",
      "name",
      "mainMuscleGroup",
      "secondaryMuscleGroups",
      "equipment",
      "description",
      "technique",
      "tips",
      "isUserCreated",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${payload.slug},
      ${payload.name},
      ${payload.mainMuscleGroup},
      ${payload.secondaryMuscleGroups},
      ${payload.equipment},
      ${payload.description},
      ${payload.technique},
      ${payload.tips},
      ${payload.isUserCreated},
      ${now},
      ${now}
    )
    ON CONFLICT ("slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "mainMuscleGroup" = EXCLUDED."mainMuscleGroup",
      "secondaryMuscleGroups" = EXCLUDED."secondaryMuscleGroups",
      "equipment" = EXCLUDED."equipment",
      "description" = EXCLUDED."description",
      "technique" = EXCLUDED."technique",
      "tips" = EXCLUDED."tips",
      "updatedAt" = EXCLUDED."updatedAt"
  `);
}
