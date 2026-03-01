import { spawn } from 'node:child_process';

async function main() {
  assertValidDatabaseUrl();

  const isCi = process.env.CI === 'true';

  if (isCi) {
    console.log('CI=true detected: skipping db:doctor migrate-status gate for ephemeral bootstrap.');
    await runStep('prisma ci bootstrap (db push + generate)', ['node', ['scripts/prisma-runner.mjs', 'ci-bootstrap']]);
  } else {
    await runStep('db:doctor', ['node', ['scripts/db-doctor.mjs']]);
    await runStep('prisma migrate deploy', ['node', ['scripts/prisma-runner.mjs', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma']]);
  }

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const allowSeed = process.env.ALLOW_SEED === '1';

  if (nodeEnv === 'production' && !allowSeed) {
    console.log('Skipping seed in production. Set ALLOW_SEED=1 to seed intentionally.');
  } else {
    await runStep('prisma db seed', ['node', ['scripts/prisma-runner.mjs', 'db', 'seed']]);
  }

  const importExercises = (process.env.IMPORT_EXERCISES === '1') || nodeEnv !== 'production';
  if (importExercises) {
    await runStep('db:import:free-exercise-db', ['npm', ['run', 'db:import:free-exercise-db']]);
  }
}

function assertValidDatabaseUrl() {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  const databaseUrl = typeof rawDatabaseUrl === 'string' ? rawDatabaseUrl.trim() : '';

  if (!databaseUrl) {
    console.error('Missing DATABASE_URL. Set DATABASE_URL before running db:bootstrap.');
    console.error('Expected format: postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public');
    process.exit(1);
  }

  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    console.error('Invalid DATABASE_URL. It must start with postgres:// or postgresql://.');
    console.error(`Received: ${databaseUrl}`);
    console.error('Example: DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public');
    process.exit(1);
  }
}

function runStep(label, [command, args]) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`);

    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      if ((code ?? 1) !== 0) {
        reject(new Error(`Step failed: ${label}`));
        return;
      }

      resolve();
    });

    child.on('error', (error) => reject(error));
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
