import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

function runSingleTest(file) {
  return new Promise((resolve, reject) => {
    const runnerCommand = hasPnpmBinary() ? 'pnpm exec tsx' : 'npm exec -- tsx';
    const child = spawn(runnerCommand, [file], {
      cwd: apiRoot,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Test ${file} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Test ${file} failed with exit code ${String(code)}`));
        return;
      }

      resolve();
    });
  });
}

function hasPnpmBinary() {
  const pathValue = process.env.PATH || '';
  const pathEntries = pathValue.split(path.delimiter).filter(Boolean);
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

for (const file of testFiles) {
  await runSingleTest(file);
}
