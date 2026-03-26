import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../.."); // apps/api -> apps -> root
const recipesPath = resolve(rootDir, "apps/web/public/recipes-db/recipes/todas.json");

const content = readFileSync(recipesPath, "utf8");
console.log("Reading recipes from:", recipesPath);

interface Recipe {
  id: string;
  title: string;
  description: string;
  mealTypes: string[];
  macros: { calories: number; proteinG: number; carbsG: number; fatsG: number };
  prepTimeMinutes: number;
  cookTimeMinutes: number;
}

// The JSON is: {"recipes": [...]}
const data = JSON.parse(content);
const recipes: Recipe[] = data.recipes || [];

console.log(`Found ${recipes.length} recipes in JSON`);

// Map mealTypes to category
function mapCategory(mealTypes: string[]): string {
  if (!mealTypes || !Array.isArray(mealTypes)) return "other";
  const types = mealTypes.map(t => t.toLowerCase());
  if (types.includes("breakfast")) return "breakfast";
  if (types.includes("snack")) return "snack";
  if (types.includes("lunch")) return "lunch";
  if (types.includes("dinner")) return "dinner";
  return "other";
}

// Image placeholders for each category
const IMAGES: Record<string, string[]> = {
  breakfast: [
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80",
    "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80",
    "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=800&q=80",
  ],
  lunch: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a886ae?w=800&q=80",
  ],
  dinner: [
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
    "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  ],
  snack: [
    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80",
    "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&q=80",
  ],
};

function getImage(category: string): string {
  const images = IMAGES[category] || IMAGES.snack;
  return images[Math.floor(Math.random() * images.length)];
}

function slugify(text: string): string {
  if (!text) return "unnamed";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const prisma = new PrismaClient();
  
  console.log("🌱 Seeding recipes from JSON...\n");

  let created = 0;
  let skipped = 0;

  // Debug: print first few recipes
  console.log("Sample recipes:");
  recipes.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i+1}. id=${r.id}, title=${r.title}, mealTypes=${JSON.stringify(r.mealTypes)}, macros=${JSON.stringify(r.macros)}`);
  });

  for (const recipe of recipes) {
    if (!recipe.id || !recipe.title) {
      skipped++;
      continue;
    }
    
    const category = mapCategory(recipe.mealTypes);
    const image = getImage(category);
    const slug = slugify(recipe.title);
    const macros = recipe.macros || {};

    try {
      await prisma.recipe.upsert({
        where: { id: recipe.id },
        update: {
          name: recipe.title,
          description: recipe.description || "",
          calories: macros.calories || 0,
          protein: macros.proteinG || 0,
          carbs: macros.carbsG || 0,
          fat: macros.fatsG || 0,
          photoUrl: image,
          imageUrls: [image],
          category,
          tiempoPreparacion: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0),
          porciones: 1,
          source: "seed-json",
          slug,
        },
        create: {
          id: recipe.id,
          name: recipe.title,
          description: recipe.description || "",
          calories: macros.calories || 0,
          protein: macros.proteinG || 0,
          carbs: macros.carbsG || 0,
          fat: macros.fatsG || 0,
          photoUrl: image,
          imageUrls: [image],
          category,
          tiempoPreparacion: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0),
          porciones: 1,
          source: "seed-json",
          slug,
        },
      });
      created++;
      if (created % 10 === 0) {
        console.log(`  ✅ Created ${created} recipes...`);
      }
    } catch (e: any) {
      skipped++;
      console.log(`  ⚠️ ${recipe.title}: ${e.message.substring(0, 50)}`);
    }
  }

  const total = await prisma.recipe.count();
  console.log(`\n✅ Done! Total recipes: ${total} (created: ${created}, skipped: ${skipped})`);

  // Show breakdown by category
  const breakdown = await prisma.recipe.groupBy({
    by: ["category"],
    _count: true,
  });
  console.log("\n📊 By category:");
  breakdown.forEach(b => console.log(`  ${b.category}: ${b._count}`));

  await prisma.$disconnect();
}

main().catch(console.error);