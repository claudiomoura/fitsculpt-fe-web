import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

type FreeExerciseRecord = {
  id?: string;
  name?: string;
  force?: string | null;
  level?: string | null;
  mechanic?: string | null;
  category?: string | null;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

type PrismaExerciseClient = {
  count: (args: unknown) => Promise<number>;
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

function datasetRootDir() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  return join(scriptDir, "../../web/public/exercise-db/exercises");
}

function loadDatasetFromFilesystem(): FreeExerciseRecord[] {
  const rootDir = process.env.FREE_EXERCISE_DB_DIR ?? datasetRootDir();

  if (!existsSync(rootDir)) {
    throw new Error(`Local exercise dataset directory was not found: ${rootDir}`);
  }

  const jsonFiles = readdirSync(rootDir)
    .filter((entry) => extname(entry).toLowerCase() === ".json")
    .sort((a, b) => a.localeCompare(b));

  return jsonFiles.map((fileName) => {
    const absolutePath = join(rootDir, fileName);
    const raw = readFileSync(absolutePath, "utf8");
    return JSON.parse(raw) as FreeExerciseRecord;
  });
}

function normalizeImageUrls(images: string[]): string[] {
  return images.map((imagePath) => {
    const cleanPath = imagePath.replace(/^\/+/, "");
    if (cleanPath.startsWith("exercise-db/")) {
      return `/${cleanPath}`;
    }
    return `/exercise-db/exercises/${cleanPath}`;
  });
}

function buildTechniqueAndTips(record: FreeExerciseRecord): { technique: string | null; tips: string | null } {
  const metadata = [
    ["Level", normalizeText(record.level)],
    ["Force", normalizeText(record.force)],
    ["Mechanic", normalizeText(record.mechanic)],
    ["Category", normalizeText(record.category)],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;

  if (metadata.length === 0) {
    return { technique: null, tips: null };
  }

  const technique = metadata.map(([label, value]) => `${label}: ${value}`).join("\n");
  const tips = "Imported from free-exercise-db catalog";
  return { technique, tips };
}

async function main() {
  assertImportAllowed();
  prisma = await createPrismaClient();

  const existingCatalogCount = await prisma.exercise.count({
    where: {
      OR: [{ source: "free-exercise-db" }, { sourceId: { startsWith: "free-exercise-db:" } }],
    },
  });

  if (existingCatalogCount > 0) {
    console.log(`Skipping import: existing free-exercise-db catalog found (${existingCatalogCount} rows).`);
    return;
  }

  const records = loadDatasetFromFilesystem();

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
    const rawImages = normalizeStringArray(record.images);
    const imageUrls = normalizeImageUrls(rawImages);

    const mainMuscleGroup = primaryMuscles[0] ?? "General";
    const description = instructions.length > 0 ? instructions.join("\n") : null;
    const imageUrl = imageUrls[0] ?? null;

    const slugBase = slugify(`${name}-${sourceExerciseId}`) || `exercise-${sourceExerciseId}`;
    const equipment = normalizeText(record.equipment);
    const { technique, tips } = buildTechniqueAndTips(record);

    const exists = await prisma.exercise.findUnique({ where: { sourceId }, select: { id: true } });

    await prisma.exercise.upsert({
      where: { sourceId },
      create: {
        source: "free-exercise-db",
        sourceId,
        slug: slugBase,
        name,
        equipment,
        description,
        imageUrl,
        imageUrls,
        mediaUrl: null,
        mainMuscleGroup,
        secondaryMuscleGroups: secondaryMuscles,
        technique,
        tips,
        isUserCreated: false,
      },
      update: {
        source: "free-exercise-db",
        name,
        equipment,
        description,
        imageUrl,
        imageUrls,
        mediaUrl: null,
        mainMuscleGroup,
        secondaryMuscleGroups: secondaryMuscles,
        technique,
        tips,
      },
    });

    if (exists) updated += 1;
    else created += 1;
  }

  console.log(
    `free-exercise-db import complete (local files): total=${records.length}, created=${created}, updated=${updated}, skipped=${skipped}`
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
