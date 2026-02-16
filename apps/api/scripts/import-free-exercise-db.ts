const DEFAULT_DATASET_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const DEFAULT_IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

type FreeExerciseRecord = {
  id?: string;
  name?: string;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

type PrismaExerciseClient = {
  findUnique: (args: unknown) => Promise<{ id: string } | null>;
  upsert: (args: unknown) => Promise<unknown>;
};

type PrismaLikeClient = {
  exercise: PrismaExerciseClient;
  $disconnect: () => Promise<void>;
};

let prisma: PrismaLikeClient | null = null;

async function createPrismaClient(): Promise<PrismaLikeClient> {
  const prismaModule = (await import("@prisma/client")) as {
    PrismaClient?: new () => PrismaLikeClient;
    default?: { PrismaClient?: new () => PrismaLikeClient };
  };

  const PrismaClientCtor = prismaModule.PrismaClient ?? prismaModule.default?.PrismaClient;
  if (!PrismaClientCtor) {
    throw new Error("PrismaClient is unavailable. Run `npm run db:generate --prefix apps/api` first.");
  }

  return new PrismaClientCtor();
}

function assertImportAllowed() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allowImport = process.env.ALLOW_IMPORT === "1";

  if (nodeEnv === "production" && !allowImport) {
    throw new Error("Import blocked in production. Set ALLOW_IMPORT=1 to run intentionally.");
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => normalizeText(item))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function buildImageUrl(sourceExerciseId: string, imageName: string): string {
  const imageBase = process.env.FREE_EXERCISE_DB_IMAGE_BASE_URL ?? DEFAULT_IMAGE_BASE_URL;
  return `${imageBase}/${encodeURIComponent(sourceExerciseId)}/${encodeURIComponent(imageName)}`;
}

async function fetchDataset(url: string): Promise<FreeExerciseRecord[]> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "fitsculpt-importer/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset (${response.status} ${response.statusText}) from ${url}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("Dataset payload is not an array");
  }

  return payload as FreeExerciseRecord[];
}

async function main() {
  assertImportAllowed();
  prisma = await createPrismaClient();

  const datasetUrl = process.env.FREE_EXERCISE_DB_URL ?? DEFAULT_DATASET_URL;
  const records = await fetchDataset(datasetUrl);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const sourceExerciseId = normalizeText(record.id);
    const name = normalizeText(record.name);

    if (!sourceExerciseId || !name) {
      skipped += 1;
      continue;
    }

    const sourceId = `free-exercise-db:${sourceExerciseId}`;
    const primaryMuscles = normalizeStringArray(record.primaryMuscles);
    const secondaryMuscles = normalizeStringArray(record.secondaryMuscles);
    const instructions = normalizeStringArray(record.instructions);
    const images = normalizeStringArray(record.images);

    const mainMuscleGroup = primaryMuscles[0] ?? "General";
    const description = instructions.length > 0 ? instructions.join("\n") : null;
    const imageUrl = images.length > 0 ? buildImageUrl(sourceExerciseId, images[0]) : null;

    const slugBase = slugify(`${name}-${sourceExerciseId}`) || `exercise-${sourceExerciseId}`;
    const equipment = normalizeText(record.equipment);

    const exists = await prisma.exercise.findUnique({ where: { sourceId }, select: { id: true } });

    await prisma.exercise.upsert({
      where: { sourceId },
      create: {
        sourceId,
        slug: slugBase,
        name,
        equipment,
        description,
        imageUrl,
        mediaUrl: null,
        mainMuscleGroup,
        secondaryMuscleGroups: secondaryMuscles,
        technique: null,
        tips: null,
        isUserCreated: false,
      },
      update: {
        name,
        equipment,
        description,
        imageUrl,
        mediaUrl: null,
        mainMuscleGroup,
        secondaryMuscleGroups: secondaryMuscles,
      },
    });

    if (exists) updated += 1;
    else created += 1;
  }

  console.log(
    `free-exercise-db import complete: total=${records.length}, created=${created}, updated=${updated}, skipped=${skipped}`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
