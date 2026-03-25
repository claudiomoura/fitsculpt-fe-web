#!/usr/bin/env node
/**
 * Run prisma commands against local database
 * Usage: node scripts/db-local-prisma.js db push
 */

import { config as dotenvConfig } from "dotenv";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(__dirname, "..");

// Load .env.local with override
dotenvConfig({ path: path.join(API_ROOT, ".env.local"), override: true });

// Also check for exported vars
if (process.env.DATABASE_URL?.includes("neon")) {
  console.log("⚠️  WARNING: DATABASE_URL still points to Neon!");
  console.log("   Current value:", process.env.DATABASE_URL);
  console.log("   Setting to local PostgreSQL...");
}

// Force local database
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fitsculpt_api_dev";
process.env.DIRECT_URL = "postgresql://postgres:postgres@localhost:5432/fitsculpt_api_dev";

console.log("📦 Using database:", process.env.DATABASE_URL);

// Get the command from args
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.log(`
Usage: node scripts/db-local-prisma.js <prisma-command> [args...]

Examples:
  node scripts/db-local-prisma.js db push
  node scripts/db-local-prisma.js db push --force-reset
  node scripts/db-local-prisma.js migrate dev
  node scripts/db-local-prisma.js generate
  node scripts/db-local-prisma.js studio
  `);
  process.exit(1);
}

// Run prisma with the command (Windows uses .cmd)
const isWindows = process.platform === "win32";
const prismaBin = isWindows ? "prisma.cmd" : "prisma";
const prismaPath = path.join(API_ROOT, "node_modules", ".bin", prismaBin);

const child = spawn(prismaPath, [command, ...args], {
  cwd: API_ROOT,
  stdio: "inherit",
  env: { ...process.env },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
