#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const helpText = `
FitSculpt DB dump (Postgres)

Usage:
  npm run db:dump

Optional env vars:
  DATABASE_URL   Postgres connection string (required)
  BACKUP_DIR     Output folder (default: apps/api/backups)
  BACKUP_PREFIX  Filename prefix (default: fitsculpt-db)

Notes:
  - Requires pg_dump installed and available in PATH.
  - File output format is custom (-F c), suitable for pg_restore.
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(helpText.trim());
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is required.');
  process.exit(1);
}

const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR ?? 'backups');
const prefix = process.env.BACKUP_PREFIX ?? 'fitsculpt-db';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const fileName = `${prefix}-${timestamp}.dump`;
const outputPath = path.join(backupDir, fileName);

fs.mkdirSync(backupDir, { recursive: true });

console.log(`🗄️  Creating dump: ${outputPath}`);

const child = spawn(
  'pg_dump',
  ['--no-owner', '--no-privileges', '-F', 'c', '-d', databaseUrl, '-f', outputPath],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('❌ pg_dump not found in PATH. Install PostgreSQL client tools and try again.');
  } else {
    console.error(`❌ Failed to start pg_dump: ${err.message}`);
  }
  process.exit(1);
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log(`✅ Dump created successfully: ${outputPath}`);
    return;
  }

  console.error(`❌ pg_dump exited with code ${code}`);
  process.exit(code ?? 1);
});
