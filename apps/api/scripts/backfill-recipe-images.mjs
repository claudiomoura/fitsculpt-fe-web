#!/usr/bin/env node
/**
 * Backfill recipe images from filesystem.
 * Scans public/recipe-images/recipes/ and updates DB records.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const IMAGES_ROOT = path.resolve(__dirname, "../../web/public/recipe-images/recipes");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

async function main() {
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.log(`Images directory not found: ${IMAGES_ROOT}`);
    console.log("Nothing to backfill.");
    process.exit(0);
  }

  const dirs = fs.readdirSync(IMAGES_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  console.log(`Found ${dirs.length} recipe image directories`);

  let updated = 0;
  let skipped = 0;

  for (const dir of dirs) {
    const dirPath = path.join(IMAGES_ROOT, dir.name);
    const files = fs.readdirSync(dirPath).filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));

    if (files.length === 0) continue;

    const imageUrls = files.map((f) => `/recipe-images/recipes/${dir.name}/${f}`);
    const primaryUrl = imageUrls[0];

    // Try to find recipe by slug first, then by slugified name
    let recipe = await prisma.recipe.findFirst({
      where: { slug: dir.name },
      select: { id: true, name: true, photoUrl: true },
    });

    if (!recipe) {
      skipped++;
      continue;
    }

    if (recipe.photoUrl && fs.existsSync(path.resolve(__dirname, "../../web/public", recipe.photoUrl.slice(1)))) {
      skipped++;
      continue;
    }

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        photoUrl: primaryUrl,
        imageUrls,
      },
    });

    console.log(`✅ ${recipe.name} → ${primaryUrl}`);
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
