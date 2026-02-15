import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const failedMigrations = await prisma.$queryRaw`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL
      AND rolled_back_at IS NULL
    ORDER BY started_at ASC
  `;

  if (!Array.isArray(failedMigrations) || failedMigrations.length === 0) {
    console.log('No failed migrations to repair.');
    return;
  }

  for (const row of failedMigrations) {
    const migrationName = row?.migration_name;

    if (!migrationName || typeof migrationName !== 'string') {
      continue;
    }

    console.log(`Marking migration as rolled back: ${migrationName}`);
    const exitCode = await runPrismaResolve(migrationName);

    if (exitCode !== 0) {
      throw new Error(`Failed to mark migration ${migrationName} as rolled back.`);
    }
  }

  console.log('Repair complete. You can rerun `npm run db:bootstrap`.');
}

function runPrismaResolve(migrationName) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/prisma-runner.mjs', 'migrate', 'resolve', '--rolled-back', migrationName, '--schema', 'prisma/schema.prisma'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', (error) => reject(error));
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
