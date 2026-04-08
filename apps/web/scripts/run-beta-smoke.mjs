import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const extraArgs = process.argv.slice(2);
const shouldIncludeTokenLifecycle = process.env.E2E_INCLUDE_TOKEN_LIFECYCLE === '1';
const command = hasPnpmBinary()
  ? (process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm')
  : 'npm';

// Run all smoke tests together in a single Playwright process to avoid 
// globalSetup issues between test files
const smokeSpecs = [
  'e2e/core-loop.spec.ts',
  'e2e/nutrition-checkin-core.spec.ts',
  // NOTE: gym-nutrition-flow.spec.ts and gym-flow.spec.ts require gym TRAINER role setup
  // which needs additional seed data. Not yet part of reliable smoke.
];

const commandArgs = [
  'exec',
  ...(command === 'npm' ? ['--'] : []),
  'playwright', 
  'test', 
  ...smokeSpecs, 
  ...extraArgs
];

const result = spawnSync(command, commandArgs, { 
  stdio: 'inherit', 
  env: process.env, 
  shell: process.platform === 'win32' 
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (shouldIncludeTokenLifecycle) {
  const tokenArgs = ['exec', ...(command === 'npm' ? ['--'] : []), 'playwright', 'test', 'e2e/token-lifecycle.spec.ts', ...extraArgs];
  const tokenResult = spawnSync(command, tokenArgs, { 
    stdio: 'inherit', 
    env: process.env, 
    shell: process.platform === 'win32' 
  });
  if (tokenResult.status !== 0) {
    process.exit(tokenResult.status ?? 1);
  }
} else {
  console.log('Skipping optional token lifecycle smoke (E2E_INCLUDE_TOKEN_LIFECYCLE!=1)');
}

function hasPnpmBinary() {
  const pathValue = process.env.PATH || '';
  const pathEntries = pathValue.split(process.platform === 'win32' ? ';' : ':').filter(Boolean);
  const candidates = process.platform === 'win32'
    ? ['pnpm.cmd', 'pnpm.exe', 'pnpm.ps1']
    : ['pnpm'];

  for (const entry of pathEntries) {
    for (const candidate of candidates) {
      if (existsSync(path.join(entry, candidate))) {
        return true;
      }
    }
  }

  return false;
}
