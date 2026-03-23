#!/usr/bin/env tsx
/**
 * Import recipe images from Unsplash API.
 *
 * Unsplash requires HOTLINKING to their CDN URLs (not downloading).
 * We store the Unsplash URL directly as photoUrl and trigger the
 * download endpoint per Unsplash API guidelines.
 *
 * Usage:
 *   UNSPLASH_ACCESS_KEY=xxx tsx scripts/import-recipe-images.ts
 *   UNSPLASH_ACCESS_KEY=xxx tsx scripts/import-recipe-images.ts --dry-run
 *   UNSPLASH_ACCESS_KEY=xxx tsx scripts/import-recipe-images.ts --limit 10
 *   UNSPLASH_ACCESS_KEY=xxx tsx scripts/import-recipe-images.ts --offset 50
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const UNSPLASH_SEARCH_API = "https://api.unsplash.com/search/photos";
const UNSPLASH_DOWNLOAD_TRIGGER = "https://api.unsplash.com/photos";
const RATE_LIMIT_MS = 75000; // 50 req/hour = 1 every ~72s, with 3s buffer

type UnsplashPhoto = {
  id: string;
  urls: { regular?: string; small?: string; thumb?: string };
  user: { name?: string; links?: { html?: string } };
  links?: { html?: string; download_location?: string };
  alt_description?: string | null;
  description?: string | null;
};

type SearchResult = {
  imageUrl: string;
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
  photoId: string;
  downloadLocation: string;
  altText: string;
} | null;

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
  offset: number;
};

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    limit: (() => {
      const idx = args.indexOf("--limit");
      if (idx !== -1 && args[idx + 1]) return Number(args[idx + 1]);
      return null;
    })(),
    offset: (() => {
      const idx = args.indexOf("--offset");
      if (idx !== -1 && args[idx + 1]) return Number(args[idx + 1]);
      return 0;
    })(),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function searchUnsplash(query: string, accessKey: string, retry = true): Promise<SearchResult> {
  const url = new URL(UNSPLASH_SEARCH_API);
  url.searchParams.set("query", `${query} food recipe plate`);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) {
      if (res.status === 403 && retry) {
        console.log(`  ⏳ Rate limited — waiting 60s and retrying...`);
        await sleep(60000);
        return searchUnsplash(query, accessKey, false);
      }
      console.error(`  ❌ Unsplash API error: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = (await res.json()) as { results?: UnsplashPhoto[] };
    const photo = data.results?.[0];
    if (!photo) return null;

    return {
      imageUrl: photo.urls.regular ?? photo.urls.small ?? "",
      photographerName: photo.user?.name ?? "Unknown",
      photographerUrl: photo.user?.links?.html ?? `https://unsplash.com/@unknown`,
      unsplashUrl: photo.links?.html ?? `https://unsplash.com/photos/${photo.id}`,
      photoId: photo.id,
      downloadLocation: photo.links?.download_location ?? "",
      altText: photo.alt_description ?? photo.description ?? query,
    };
  } catch (err) {
    console.error(`  ❌ Unsplash fetch error:`, err);
    return null;
  }
}

/**
 * Trigger Unsplash download endpoint (required by API guidelines).
 * This reports to Unsplash that the photo was "used" in our app.
 */
async function triggerDownload(downloadLocation: string, accessKey: string): Promise<void> {
  if (!downloadLocation) return;
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
  } catch {
    // Non-critical — don't fail the import if download trigger fails
  }
}

function buildAttribution(name: string, photographerUrl: string, unsplashUrl: string): string {
  return `Photo by ${name} on Unsplash`;
}

async function main() {
  const { dryRun, limit, offset } = parseCliArgs();
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.error("UNSPLASH_ACCESS_KEY environment variable is required");
    process.exit(1);
  }

  const recipes = await prisma.recipe.findMany({
    select: { id: true, name: true, slug: true, photoUrl: true },
    orderBy: { name: "asc" },
    skip: offset,
    ...(limit ? { take: limit } : {}),
  });

  console.log(`📸 Unsplash Recipe Image Importer`);
  console.log(`   Found ${recipes.length} recipes (offset: ${offset})`);
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`   Rate limit: ~1 request per ${RATE_LIMIT_MS}ms`);
  console.log(`   Estimated time: ~${Math.ceil((recipes.length * RATE_LIMIT_MS) / 60000)} minutes`);
  console.log("");

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, recipe] of recipes.entries()) {
    const slug = slugify(recipe.slug || recipe.name);

    // Skip if already has photoUrl
    if (recipe.photoUrl) {
      console.log(`[${i + 1}/${recipes.length}] ⏭️  ${recipe.name} — already has image`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${recipes.length}] 🔍 ${recipe.name} — searching...`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would search: "${recipe.name} food recipe plate"`);
      continue;
    }

    const result = await searchUnsplash(recipe.name, accessKey);

    if (!result || !result.imageUrl) {
      console.log(`  ❌ No image found`);
      failed++;
      continue;
    }

    // Trigger download endpoint (Unsplash requirement)
    await triggerDownload(result.downloadLocation, accessKey);

    // Store Unsplash URL directly (hotlinking requirement)
    const attribution = buildAttribution(result.photographerName, result.photographerUrl, result.unsplashUrl);

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        photoUrl: result.imageUrl,
        imageUrls: [result.imageUrl],
        source: "unsplash",
        sourceId: `unsplash:${result.photoId}`,
        slug,
      },
    });

    console.log(`  ✅ ${result.photographerName} — ${result.imageUrl.slice(0, 60)}...`);
    imported++;

    // Rate limit: 50 req/hour = 1 every 72 seconds minimum
    if (i < recipes.length - 1) {
      console.log(`  ⏳ Waiting ${RATE_LIMIT_MS / 1000}s (rate limit)...`);
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log("");
  console.log(`═══════════════════════════════════════`);
  console.log(`📸 Import complete!`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log(`═══════════════════════════════════════`);

  if (imported > 0) {
    console.log("");
    console.log(`⚠️  Unsplash Attribution Required:`);
    console.log(`   Display "Photo by [Photographer] on Unsplash" for each recipe.`);
    console.log(`   Link photographer name to their Unsplash profile.`);
    console.log(`   Link "Unsplash" to the photo page.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
