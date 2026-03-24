import { spawnSync } from 'node:child_process';

const extraArgs = process.argv.slice(2);
const shouldIncludeTokenLifecycle = process.env.E2E_INCLUDE_TOKEN_LIFECYCLE === '1';
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

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
  const tokenArgs = ['exec', 'playwright', 'test', 'e2e/token-lifecycle.spec.ts', ...extraArgs];
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
