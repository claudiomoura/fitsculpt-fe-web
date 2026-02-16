import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.resolve(__dirname, '..');

loadEnv();

const [modeOrArg, ...restArgs] = process.argv.slice(2);

if (!modeOrArg) {
  console.error('Usage: node scripts/prisma-runner.mjs <prisma args... | seed:safe>');
  process.exit(1);
}

const env = createPatchedEnv(process.env);

if (modeOrArg === 'seed:safe') {
  runSafeSeed(env)
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (modeOrArg === 'reset:safe') {
  runSafeReset(restArgs, env)
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (modeOrArg === 'doctor') {
  runDoctor(env)
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (modeOrArg === 'repair') {
  runRepair(env)
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else {
  runPrismaWithRetry([modeOrArg, ...restArgs], env)
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}

function loadEnv() {
  dotenv.config({ path: path.join(API_ROOT, '.env') });
  dotenv.config({ path: path.join(API_ROOT, '.env.local'), override: true });
}

function createPatchedEnv(baseEnv) {
  const nextEnv = { ...baseEnv };
  const selectedUrl = baseEnv.DIRECT_URL || baseEnv.DATABASE_URL;

  if (!selectedUrl) {
    return nextEnv;
  }

  const patchedUrl = patchDatabaseUrl(selectedUrl);
  nextEnv.DATABASE_URL = patchedUrl;

  if (baseEnv.DIRECT_URL) {
    nextEnv.DIRECT_URL = patchDatabaseUrl(baseEnv.DIRECT_URL);
  }

  return nextEnv;
}

function patchDatabaseUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const isRenderHost = parsed.hostname.endsWith('.render.com') || parsed.hostname.includes('render.com');

    if (!isRenderHost) {
      return rawUrl;
    }

    parsed.searchParams.set('sslmode', 'require');
    parsed.searchParams.set('connection_limit', '1');
    parsed.searchParams.set('pool_timeout', '0');

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

async function runSafeReset(resetArgs, envVars) {
  const isProduction = (envVars.NODE_ENV || '').toLowerCase() === 'production';

  if (isProduction) {
    console.error('Refusing to reset database in production (NODE_ENV=production).');
    return 1;
  }

  if (envVars.ALLOW_DB_RESET !== '1') {
    console.error('Refusing to reset database. Set ALLOW_DB_RESET=1 and re-run `npm run db:reset`.');
    return 1;
  }

  return runPrismaWithRetry(['migrate', 'reset', ...resetArgs], envVars);
}

async function runDoctor(envVars) {
  const deployResult = await runPrismaWithRetryDetailed(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], envVars);

  if (deployResult.code === 0) {
    console.log('✅ Database migration deploy succeeded. No repair needed.');
    return 0;
  }

  if (containsP3009(deployResult.combinedOutput)) {
    printP3009Guidance();
    return 1;
  }

  console.error('❌ Prisma migrate deploy failed for a reason other than P3009. Review logs above.');
  return deployResult.code || 1;
}

async function runRepair(envVars) {
  const deployResult = await runPrismaWithRetryDetailed(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], envVars);

  if (deployResult.code === 0) {
    console.log('✅ Database migration deploy succeeded. No repair needed.');
    return 0;
  }

  if (!containsP3009(deployResult.combinedOutput)) {
    console.error('❌ Repair only handles Prisma P3009. Run `npm run db:doctor` for diagnostics.');
    return deployResult.code || 1;
  }

  const migrationName = extractMigrationName(deployResult.combinedOutput);
  if (!migrationName) {
    console.error('❌ Detected P3009 but could not detect migration name from Prisma output.');
    printP3009Guidance();
    return 1;
  }

  console.log(`Detected failed migration: ${migrationName}`);
  console.log('Marking migration as rolled back so deploy can continue...');

  const resolveResult = await runPrismaWithRetryDetailed([
    'migrate',
    'resolve',
    '--rolled-back',
    migrationName,
    '--schema',
    'prisma/schema.prisma',
  ], envVars);

  if (resolveResult.code !== 0) {
    console.error('❌ Failed to mark migration as rolled back.');
    return resolveResult.code || 1;
  }

  console.log('Re-running migrate deploy...');
  return runPrismaWithRetry(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], envVars);
}

async function runSafeSeed(envVars) {
  if (envVars.FORCE_SEED === '1') {
    console.log('FORCE_SEED=1 set; running seed.');
    return runPrismaWithRetry(['db', 'seed'], envVars);
  }

  if (envVars.ALLOW_SEED !== '1') {
    console.log('Skipping seed: set ALLOW_SEED=1 to allow safe seeding, or FORCE_SEED=1 to force.');
    return 0;
  }

  const isEmpty = await isDatabaseEmpty(envVars);
  if (!isEmpty) {
    console.log('Skipping seed: database is not empty. Set FORCE_SEED=1 to override.');
    return 0;
  }

  console.log('Database appears empty; running seed.');
  return runPrismaWithRetry(['db', 'seed'], envVars);
}

async function isDatabaseEmpty(envVars) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: envVars.DATABASE_URL } } });

  try {
    const [users, gyms, exercises] = await Promise.all([
      prisma.user.count(),
      prisma.gym.count(),
      prisma.exercise.count(),
    ]);

    return users === 0 && gyms === 0 && exercises === 0;
  } finally {
    await prisma.$disconnect();
  }
}

async function runPrismaWithRetry(args, envVars, maxAttempts = 4) {
  const result = await runPrismaWithRetryDetailed(args, envVars, maxAttempts);
  return result.code === 0 ? 0 : result.code || 1;
}

async function runPrismaWithRetryDetailed(args, envVars, maxAttempts = 4) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    const result = await runPrisma(args, envVars);

    if (result.code === 0) {
      return result;
    }

    if (containsP3009(result.combinedOutput)) {
      printP3009Guidance();
    }

    if (!isTransientPrismaError(result.combinedOutput) || attempt >= maxAttempts) {
      return result;
    }

    const delayMs = 500 * attempt;
    console.warn(`Transient Prisma connectivity error detected (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`);
    await wait(delayMs);
  }

  return { code: 1, combinedOutput: '' };
}

function runPrisma(args, envVars) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['prisma', ...args], {
      cwd: API_ROOT,
      env: envVars,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let combinedOutput = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stderr.write(chunk);
    });

    child.on('error', (error) => reject(error));

    child.on('close', (code) => {
      resolve({ code, combinedOutput });
    });
  });
}

function isTransientPrismaError(output) {
  return /(P1017|ECONNRESET|ETIMEDOUT|Can't reach database server|server closed the connection|Connection terminated unexpectedly)/i.test(output);
}

function containsP3009(output) {
  return /P3009/i.test(output);
}

function extractMigrationName(output) {
  const match = output.match(/migration[s]?\s+`([^`]+)`/i) || output.match(/migration name:\s*([^\s]+)/i);
  return match ? match[1] : null;
}

function printP3009Guidance() {
  console.error('⚠️ Prisma reported P3009 (failed migration found).');
  console.error('Run these commands from apps/api:');
  console.error('  1) npm run db:repair');
  console.error('  2) npm run db:deploy');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
