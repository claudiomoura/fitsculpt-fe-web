#!/usr/bin/env node
/**
 * FitSculpt Data Migration Script
 * 
 * Migrate data between Neon (production) and local PostgreSQL
 * 
 * Uso:
 *   node scripts/migrate-data.js --export --source=neon   → Exporta desde Neon a JSON
 *   node scripts/migrate-data.js --export --source=local  → Exporta desde local a JSON
 *   node scripts/migrate-data.js --import                 → Importa JSON a la DB actual
 *   node scripts/migrate-data.js --sync                    → Sync solo usuarios seleccionados
 */

import { config as dotenvConfig } from "dotenv";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

// Load .env.local with override for local operations
dotenvConfig({ path: ".env.local", override: true });

const TABLES_TO_MIGRATE = [
  "User",
  "UserProfile", 
  "Recipe",
  "Exercise",
  "UserFood",
  "Gym",
];

const EXPORT_FILE = "migration-export.json";

// Parse args
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
};

const hasCommand = (cmd) => args.includes(cmd);

// Get database URL based on source
function getDbUrl(source) {
  if (source === "neon") {
    // Neon credentials (restore from .env.neon.backup if needed)
    return process.env.NEON_DATABASE_URL || "postgresql://neondb_owner:npg_mbjzBP46GwdE@ep-misty-bird-amalh9kt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require";
  }
  // Local
  return "postgresql://postgres:postgres@localhost:5432/fitsculpt_api_dev";
}

function createPrismaClient(dbUrl) {
  return new PrismaClient({
    datasourceUrl: dbUrl,
  });
}

async function exportData(source) {
  const dbUrl = getDbUrl(source);
  console.log(`📤 Exporting data from ${source}...`);
  console.log(`   DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}\n`);
  
  const prisma = createPrismaClient(dbUrl);
  const data = {};
  
  for (const table of TABLES_TO_MIGRATE) {
    console.log(`  Exporting ${table}...`);
    try {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      // @ts-ignore
      const records = await prisma[modelName].findMany({});
      data[table] = records;
      console.log(`    ✓ ${records.length} records`);
    } catch (e) {
      console.log(`    ✗ Error: ${e.message}`);
    }
  }
  
  await fs.writeFile(EXPORT_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✅ Exported to ${EXPORT_FILE}`);
  await prisma.$disconnect();
}

async function importData() {
  console.log("📥 Importing data to current DB...");
  console.log(`   DB: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}\n`);
  
  const fileContent = await fs.readFile(EXPORT_FILE, "utf-8");
  const data = JSON.parse(fileContent);
  
  for (const table of TABLES_TO_MIGRATE) {
    if (!data[table]) continue;
    
    console.log(`  Importing ${table}...`);
    const records = data[table];
    const modelName = table.charAt(0).toLowerCase() + table.slice(1);
    
    let imported = 0;
    for (const record of records) {
      try {
        // @ts-ignore
        await prisma[modelName].upsert({
          where: { id: record.id },
          update: record,
          create: record,
        });
        imported++;
      } catch (e) {
        console.log(`    ✗ Error on ${record.id}: ${e.message}`);
      }
    }
    console.log(`    ✓ ${imported} records imported`);
  }
  
  console.log("\n✅ Import complete!");
}

async function syncUsers() {
  console.log("🔄 Syncing users from Neon to local...\n");
  
  const sourcePrisma = createPrismaClient(getDbUrl("neon"));
  const users = await sourcePrisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    take: 5,
  });
  
  console.log(`Found ${users.length} admin users to sync`);
  
  const localPrisma = createPrismaClient(getDbUrl("local"));
  
  for (const user of users) {
    console.log(`  Syncing ${user.email}...`);
    await localPrisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
        passwordHash: user.passwordHash,
      },
    });
    console.log("    ✓ Done");
  }
  
  await sourcePrisma.$disconnect();
  await localPrisma.$disconnect();
  console.log("\n✅ Sync complete!");
}

// CLI
const source = getArg("source") || "neon";

if (hasCommand("--export")) {
  await exportData(source);
} else if (hasCommand("--import")) {
  await importData();
} else if (hasCommand("--sync")) {
  await syncUsers();
} else {
  console.log(`
FitSculpt Data Migration
========================

Uso:
  node scripts/migrate-data.js --export --source=neon   Exportar desde Neon
  node scripts/migrate-data.js --export --source=local  Exportar desde local
  node scripts/migrate-data.js --import                 Importar a DB actual
  node scripts/migrate-data.js --sync                    Sync admin users

Sources:
  neon   → Neon cloud (production)
  local  → Local PostgreSQL
`);
}

const prisma = createPrismaClient(process.env.DATABASE_URL);
await prisma.$disconnect();
