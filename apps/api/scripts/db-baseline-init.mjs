import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(API_ROOT, "prisma", "migrations");

dotenv.config({ path: path.join(API_ROOT, ".env") });
dotenv.config({ path: path.join(API_ROOT, ".env.local"), override: true });

const isDryRun = process.argv.includes("--dry-run");

if (process.env.CI === "true") {
  console.error("Refusing baseline init in CI.");
  process.exit(1);
}

if ((process.env.NODE_ENV || "").toLowerCase() === "production") {
  console.error("Refusing baseline init in production.");
  process.exit(1);
}

const selectedUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!selectedUrl) {
  console.error("Missing DIRECT_URL/DATABASE_URL. Configure .env first.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: selectedUrl } } });

try {
  const [migrationsTable] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
    )
  `;

  if (migrationsTable?.exists) {
    console.log("_prisma_migrations already exists. Baseline is already initialized.");
    process.exit(0);
  }

  const [tableCount] = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
  `;

  const nonMigrationTableCount = Number(tableCount?.count ?? 0);
  if (nonMigrationTableCount === 0) {
    console.log("Database is empty. Run `npm run db:deploy` instead of baseline init.");
    process.exit(0);
  }

  const migrationDirs = await listMigrationDirectories();
  if (migrationDirs.length === 0) {
    console.error("No Prisma migrations found in prisma/migrations.");
    process.exit(1);
  }

  console.log(`Found ${nonMigrationTableCount} existing table(s) and no _prisma_migrations history.`);
  console.log(`Will mark ${migrationDirs.length} migration(s) as applied${isDryRun ? " (dry-run)" : ""}.`);

  for (const migrationName of migrationDirs) {
    const cmdArgs = [
      "scripts/prisma-runner.mjs",
      "migrate",
      "resolve",
      "--applied",
      migrationName,
      "--schema",
      "prisma/schema.prisma",
    ];

    if (isDryRun) {
      console.log(`DRY-RUN: node ${cmdArgs.join(" ")}`);
      continue;
    }

    const exitCode = await runNodeCommand(cmdArgs);
    if (exitCode !== 0) {
      console.error(`Failed while marking migration as applied: ${migrationName}`);
      process.exit(exitCode);
    }
  }

  if (!isDryRun) {
    console.log("Baseline initialization completed.");
    console.log("Next steps: npm run db:deploy && npm run dev");
  }
} finally {
  await prisma.$disconnect();
}

async function listMigrationDirectories() {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function runNodeCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: API_ROOT,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}
