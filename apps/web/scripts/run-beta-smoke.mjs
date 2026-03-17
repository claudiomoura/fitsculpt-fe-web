import { spawnSync } from 'node:child_process';

const extraArgs = process.argv.slice(2);
const shouldIncludeTokenLifecycle = process.env.E2E_INCLUDE_TOKEN_LIFECYCLE === '1';
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const run = (specPath) => {
  const commandArgs = ['exec', 'playwright', 'test', specPath, ...extraArgs];
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('e2e/core-loop.spec.ts');

if (shouldIncludeTokenLifecycle) {
  run('e2e/token-lifecycle.spec.ts');
} else {
  console.log('Skipping optional token lifecycle smoke (E2E_INCLUDE_TOKEN_LIFECYCLE!=1)');
}
