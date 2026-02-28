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

async function testP1000LogsFriendlyError() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const prisma = {
    $queryRaw: async () => {
      throw { errorCode: "P1000", message: "auth failed" };
    },
  };

  let thrown = false;
  try {
    await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
  } catch {
    thrown = true;
  }

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
  try {
    await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
  } catch (error) {
    thrown = (error as Error).message === "DATABASE_BASELINE_REQUIRED";
  }

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
  try {
    await runDatabasePreflight(prisma as never, logger, { source: "DATABASE_URL", host: "db.example.com", database: "app" });
  } catch (error) {
    thrown = (error as Error).message === "DATABASE_MIGRATIONS_REQUIRED";
  }

  assert(thrown, "Expected DATABASE_MIGRATIONS_REQUIRED when required migrations are missing");
  const missingMigrationLog = entries.find((entry) => entry.msg.includes("required migrations are missing"));
  assert(Boolean(missingMigrationLog), "Expected required-migrations boot message");
}

async function testHappyPathPasses() {
  const entries: LoggerEntry[] = [];
  const logger = createLogger(entries);
  const responses = [1, [{ exists: true }]];
  const prisma = {
    $queryRaw: async () => responses.shift(),
  };

  await runDatabasePreflight(prisma as never, logger, { source: "DIRECT_URL", host: "db.internal", database: "app" });

  const completionLog = entries.find((entry) => entry.msg.includes("preflight completed"));
  assert(Boolean(completionLog), "Expected completion log in happy path");
}

await testP1000LogsFriendlyError();
await testMissingMigrationsWithTablesFails();
await testMissingRequiredMigrationsFails();
await testHappyPathPasses();

console.log("dbPreflight tests passed");
