import { runDatabasePreflight } from "../dbPreflight.js";

type LoggerEntry = { level: "info" | "warn" | "error"; msg: string; obj: Record<string, unknown> };

function createLogger(entries: LoggerEntry[]) {
  return {
    info: (obj: Record<string, unknown>, msg: string) => entries.push({ level: "info", msg, obj }),
    warn: (obj: Record<string, unknown>, msg: string) => entries.push({ level: "warn", msg, obj }),
    error: (obj: Record<string, unknown>, msg: string) => entries.push({ level: "error", msg, obj }),
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function withPreflightEnv<T>(
  overrides: Partial<Record<"CI" | "FS_CI_DB_MODE" | "SKIP_DB_PREFLIGHT", string | undefined>>,
  run: () => Promise<T>
): Promise<T> {
  const previous = {
    CI: process.env.CI,
    FS_CI_DB_MODE: process.env.FS_CI_DB_MODE,
    SKIP_DB_PREFLIGHT: process.env.SKIP_DB_PREFLIGHT,
  };

  const next = { ...previous, ...overrides };
  if (next.CI === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = next.CI;
  }

  if (next.FS_CI_DB_MODE === undefined) {
    delete process.env.FS_CI_DB_MODE;
  } else {
    process.env.FS_CI_DB_MODE = next.FS_CI_DB_MODE;
  }

  if (next.SKIP_DB_PREFLIGHT === undefined) {
    delete process.env.SKIP_DB_PREFLIGHT;
  } else {
    process.env.SKIP_DB_PREFLIGHT = next.SKIP_DB_PREFLIGHT;
  }

  try {
    return await run();
  } finally {
    if (previous.CI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = previous.CI;
    }

    if (previous.FS_CI_DB_MODE === undefined) {
      delete process.env.FS_CI_DB_MODE;
    } else {
      process.env.FS_CI_DB_MODE = previous.FS_CI_DB_MODE;
    }

    if (previous.SKIP_DB_PREFLIGHT === undefined) {
      delete process.env.SKIP_DB_PREFLIGHT;
    } else {
      process.env.SKIP_DB_PREFLIGHT = previous.SKIP_DB_PREFLIGHT;
    }
  }
}

async function testP1000LogsFriendlyError() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const prisma = {
    $queryRaw: async () => {
      throw { errorCode: "P1000", message: "auth failed" };
    },
  };

  let thrown = false;
  await withPreflightEnv({ CI: undefined, FS_CI_DB_MODE: undefined, SKIP_DB_PREFLIGHT: undefined }, async () => {
    try {
      await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
    } catch {
      thrown = true;
    }
  });

  assert(thrown, "Expected preflight to fail on P1000");
  const authLog = entries.find((entry) => entry.msg.includes("credenciais inválidas"));
  assert(Boolean(authLog), "Expected friendly invalid-credentials boot message");
}

async function testMissingMigrationsWithTablesFails() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const responses = [1, [{ exists: false }], [{ count: 3n }]];
  const prisma = {
    $queryRaw: async () => responses.shift(),
  };

  let thrown = false;
  await withPreflightEnv({ CI: undefined, FS_CI_DB_MODE: undefined, SKIP_DB_PREFLIGHT: undefined }, async () => {
    try {
      await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
    } catch (error) {
      thrown = (error as Error).message === "DATABASE_BASELINE_REQUIRED";
    }
  });

  assert(thrown, "Expected baseline-required error when schema has tables but no _prisma_migrations");
  const baselineLog = entries.find((entry) => entry.msg.includes("baseline necessário"));
  assert(Boolean(baselineLog), "Expected baseline-required boot message");
}

async function testMissingRequiredMigrationsFails() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const responses = [1, [{ exists: true }], [{ migration_name: "20260118005910_init" }]];
  const prisma = {
    $queryRaw: async () => responses.shift(),
  };

  let thrown = false;
  await withPreflightEnv({ CI: undefined, FS_CI_DB_MODE: undefined, SKIP_DB_PREFLIGHT: undefined }, async () => {
    try {
      await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
    } catch (error) {
      thrown = (error as Error).message === "DATABASE_MIGRATIONS_REQUIRED";
    }
  });

  assert(thrown, "Expected DATABASE_MIGRATIONS_REQUIRED when required migrations are missing");
  const missingMigrationLog = entries.find((entry) => entry.msg.includes("required migrations are missing"));
  assert(Boolean(missingMigrationLog), "Expected required-migrations boot message");
}


async function testCiPushModeSkipsMigrationPreflight() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const responses = [1];
  const prisma = {
    $queryRaw: async () => responses.shift(),
  };

  await withPreflightEnv({ CI: "true", FS_CI_DB_MODE: "push", SKIP_DB_PREFLIGHT: undefined }, async () => {
    await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
  });

  const skipLog = entries.find((entry) => entry.msg.includes("Skipping DB preflight (CI push mode)"));
  assert(Boolean(skipLog), "Expected CI db push skip log");
}


async function testSkipDbPreflightTruthyFlagSkipsMigrationPreflight() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const responses = [1];
  const prisma = {
    $queryRaw: async () => responses.shift(),
  };

  await withPreflightEnv({ SKIP_DB_PREFLIGHT: "yes", CI: undefined, FS_CI_DB_MODE: undefined }, async () => {
    await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
  });

  const skipLog = entries.find((entry) => entry.msg.includes("Skipping DB preflight (CI push mode)"));
  assert(Boolean(skipLog), "Expected skip log when SKIP_DB_PREFLIGHT is truthy");
}

async function testHappyPathPasses() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const responses = [
    1,
    [{ exists: true }],
    [
      { migration_name: "20260228120000_ai_usage_log_repair_columns" },
      { migration_name: "20260228153000_add_stripe_webhook_event_idempotency" },
    ],
  ];
  const prisma = {
    $queryRaw: async () => responses.shift(),
  };

  await withPreflightEnv({ CI: undefined, FS_CI_DB_MODE: undefined, SKIP_DB_PREFLIGHT: undefined }, async () => {
    await runDatabasePreflight(prisma as never, logger, { source: "DIRECT_URL", host: "db.internal", database: "app" });
  });

  const completionLog = entries.find((entry) => entry.msg.includes("preflight completed"));
  assert(Boolean(completionLog), "Expected completion log in happy path");
}

await testP1000LogsFriendlyError();
await testMissingMigrationsWithTablesFails();
await testMissingRequiredMigrationsFails();
await testCiPushModeSkipsMigrationPreflight();
await testSkipDbPreflightTruthyFlagSkipsMigrationPreflight();
await testHappyPathPasses();

console.log("dbPreflight tests passed");
