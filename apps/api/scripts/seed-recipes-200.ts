import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Imágenes de Unsplash para recetas (reales y variadas)
const IMAGES: Record<string, string[]> = {
  breakfast: [
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80",
    "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80",
    "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=800&q=80",
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80",
  ],
  lunch: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a886ae?w=800&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
  ],
  dinner: [
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
    "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a886ae?w=800&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80",
  ],
  snack: [
    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80",
    "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&q=80",
    "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&q=80",
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f91?w=800&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
  ],
};

// Recetas por categoría (200 recetas)
const RECIPES = [
  // DESAYUNOS (50 recetas)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Desayuno Fit ${i + 1}`,
    description: `Receta de desayuno nutritiva y equilibrada número ${i + 1}`,
    calories: 250 + Math.floor(Math.random() * 300),
    protein: 15 + Math.floor(Math.random() * 20),
    carbs: 20 + Math.floor(Math.random() * 40),
    fat: 8 + Math.floor(Math.random() * 15),
    category: "breakfast",
    tiempoPreparacion: 5 + Math.floor(Math.random() * 20),
    porciones: 1,
  })),
  // ALMUERZOS (50 recetas)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Almuerzo Fit ${i + 1}`,
    description: `Receta de almuerzo saludable número ${i + 1}`,
    calories: 400 + Math.floor(Math.random() * 400),
    protein: 25 + Math.floor(Math.random() * 30),
    carbs: 30 + Math.floor(Math.random() * 50),
    fat: 15 + Math.floor(Math.random() * 20),
    category: "lunch",
    tiempoPreparacion: 15 + Math.floor(Math.random() * 30),
    porciones: 2,
  })),
  // CENAS (50 recetas)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Cena Fit ${i + 1}`,
    description: `Receta de cena ligera y nutritiva número ${i + 1}`,
    calories: 350 + Math.floor(Math.random() * 350),
    protein: 30 + Math.floor(Math.random() * 25),
    carbs: 25 + Math.floor(Math.random() * 45),
    fat: 12 + Math.floor(Math.random() * 18),
    category: "dinner",
    tiempoPreparacion: 20 + Math.floor(Math.random() * 35),
    porciones: 2,
  })),
  // SNACKS (50 recetas)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Snack Fit ${i + 1}`,
    description: `Snack saludable número ${i + 1}`,
    calories: 100 + Math.floor(Math.random() * 200),
    protein: 5 + Math.floor(Math.random() * 15),
    carbs: 10 + Math.floor(Math.random() * 25),
    fat: 3 + Math.floor(Math.random() * 12),
    category: "snack",
    tiempoPreparacion: 2 + Math.floor(Math.random() * 10),
    porciones: 1,
  })),
];

function getImage(category: string): string {
  const images = IMAGES[category] || IMAGES.snack;
  return images[Math.floor(Math.random() * images.length)];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("🌱 Starting recipe seed...\n");

  let created = 0;

  for (const recipe of RECIPES) {
    const slug = slugify(recipe.name);
    const image = getImage(recipe.category);

    try {
      await prisma.recipe.upsert({
        where: { name: recipe.name },
        update: {
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          photoUrl: image,
          imageUrls: [image],
          category: recipe.category,
          tiempoPreparacion: recipe.tiempoPreparacion,
          porciones: recipe.porciones,
          source: "seed",
          slug,
        },
        create: {
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          photoUrl: image,
          imageUrls: [image],
          category: recipe.category,
          tiempoPreparacion: recipe.tiempoPreparacion,
          porciones: recipe.porciones,
          source: "seed",
          slug,
        },
      });
      created++;
      if (created % 50 === 0) {
        console.log(`  ✅ Created ${created} recipes...`);
      }
    } catch (e) {
      console.log(`  ⚠️ Error with ${recipe.name}: ${e}`);
    }
  }

  const total = await prisma.recipe.count();
  console.log(`\n✅ Done! Total recipes: ${total}`);

  await prisma.$disconnect();
}

main().catch(console.error);