import type { PrismaClient } from "@prisma/client";

type BootLogger = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
};

type DbPreflightContext = {
  source: string;
  host: string;
  database: string;
};

export async function runDatabasePreflight(prisma: PrismaClient, logger: BootLogger, context: DbPreflightContext) {
  await assertDatabaseCredentials(prisma, logger, context);

  const shouldSkipBaselineCheck = process.env.CI === "true" || process.env.SKIP_DB_PREFLIGHT === "1";
  if (!shouldSkipBaselineCheck) {
    await assertDatabaseBaseline(prisma, logger, context);
  }
  await assertRequiredMigrations(prisma, logger, context);
  logger.info({ ...context }, "Database preflight completed");
}

const REQUIRED_MIGRATIONS = [
  "20260228120000_ai_usage_log_repair_columns",
  "20260228153000_add_stripe_webhook_event_idempotency",
];

async function assertDatabaseCredentials(prisma: PrismaClient, logger: BootLogger, context: DbPreflightContext) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    if (isPrismaErrorCode(error, "P1000")) {
      logger.error(
        {
          ...context,
          errorCode: "P1000",
          hint: "Verifica DATABASE_URL/DIRECT_URL e as credenciais de acesso ao banco",
        },
        "Database preflight failed: credenciais inválidas ou URL errada",
      );
    }
    throw error;
  }
}

async function assertDatabaseBaseline(prisma: PrismaClient, logger: BootLogger, context: DbPreflightContext) {
  const [migrationsTable] = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
    )
  `;

  if (migrationsTable?.exists) {
    return;
  }

  const [tableCount] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
  `;

  const nonMigrationTableCount = Number(tableCount?.count ?? 0);
  if (nonMigrationTableCount === 0) {
    return;
  }

  logger.error(
    {
      ...context,
      nonMigrationTableCount,
      hint: "Banco sem baseline Prisma. Gere baseline antes de subir a API",
    },
    "Database preflight failed: baseline necessário (_prisma_migrations não existe)",
  );
  throw new Error("DATABASE_BASELINE_REQUIRED");
}

async function assertRequiredMigrations(prisma: PrismaClient, logger: BootLogger, context: DbPreflightContext) {
  const appliedRows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
  `;
  const applied = new Set(appliedRows.map((row) => row.migration_name));
  const missingMigrations = REQUIRED_MIGRATIONS.filter((migrationName) => !applied.has(migrationName));

  if (missingMigrations.length === 0) {
    return;
  }

  logger.error(
    {
      ...context,
      requiredMigrations: REQUIRED_MIGRATIONS,
      missingMigrations,
      hint: "Execute `prisma migrate deploy` before starting the API",
    },
    "Database preflight failed: required migrations are missing",
  );
  throw new Error("DATABASE_MIGRATIONS_REQUIRED");
}

function isPrismaErrorCode(error: unknown, code: string) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const typed = error as { errorCode?: string };
  return typed.errorCode === code;
}
