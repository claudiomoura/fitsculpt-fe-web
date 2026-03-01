import { spawn } from 'node:child_process';

if (process.env.CI === 'true') {
  console.log('CI=true detected: skipping migrate status gate in db-doctor.');
  process.exit(0);
}

const args = ['scripts/prisma-runner.mjs', 'migrate', 'status', '--schema', 'prisma/schema.prisma'];

const child = spawn('node', args, {
  cwd: process.cwd(),
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

let output = '';

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stdout.write(chunk);
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stderr.write(chunk);
});

child.on('close', (code) => {
  if (/(P3009|failed migrations|contains failed migrations)/i.test(output)) {
    console.error('\nDetected failed migrations state (P3009). Run `npm run db:repair` and retry `npm run db:bootstrap`.');
    process.exit(2);
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
