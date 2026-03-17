import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, '..');
const testsDir = path.join(apiRoot, 'src', 'tests');

const entries = await readdir(testsDir, { withFileTypes: true });
const testFiles = entries
  .filter((entry) => entry.isFile() && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.contract.test.ts')))
  .map((entry) => path.join('src', 'tests', entry.name))
  .sort();

if (testFiles.length === 0) {
  console.error('No API test files found in src/tests.');
  process.exit(1);
}

const command = `pnpm exec tsx ${testFiles.join(' ')}`;

const child = spawn(command, [], {
  cwd: apiRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
