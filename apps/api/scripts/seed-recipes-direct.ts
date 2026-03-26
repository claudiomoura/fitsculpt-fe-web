import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const RECIPES = [
  {
    name: "Avena Proteica com Frutos Vermelhos e Nozes",
    description: "Avena cremosa com proteína whey e mirtilos.",
    category: "high-protein",
    calories: 520,
    protein: 35,
    carbs: 58,
    fat: 16,
    steps: ["Cozinhe a aveia.", "Adicione proteína.", "Sirva com mirtilos."],
    ingredients: [
      { name: "Avena", grams: 80 },
      { name: "Proteína whey", grams: 30 },
      { name: "Mirtilos", grams: 80 },
    ],
  },
  {
    name: "Tortilla de Claras com Espinafres e Feta",
    description: "Tortilla alta em proteína com espinafres.",
    category: "high-protein",
    calories: 380,
    protein: 32,
    carbs: 12,
    fat: 22,
    steps: ["Bata claras.", "Cozinhe.", "Adicione espinafres e feta."],
    ingredients: [
      { name: "Claras", grams: 200 },
      { name: "Espinafres", grams: 80 },
      { name: "Feta", grams: 40 },
    ],
  },
  {
    name: "Iogurte Grego com Granola e Manga",
    description: "Iogurte grego com granola e manga.",
    category: "balanced",
    calories: 480,
    protein: 28,
    carbs: 55,
    fat: 18,
    steps: ["Coloque iogurte.", "Adicione granola.", "Decore com manga."],
    ingredients: [
      { name: "Iogurte", grams: 250 },
      { name: "Granola", grams: 60 },
      { name: "Manga", grams: 120 },
    ],
  },
  {
    name: "Panquecas de Aveia e Banana",
    description: "Panquecas de aveia com banana.",
    category: "balanced",
    calories: 550,
    protein: 22,
    carbs: 65,
    fat: 24,
    steps: ["Triturar aveia.", "Adicionar banana.", "Cozinhar."],
    ingredients: [
      { name: "Aveia", grams: 100 },
      { name: "Banana", grams: 150 },
      { name: "Ovos", grams: 120 },
    ],
  },
  {
    name: "Ovos Mexidos com Abacate e Salmão",
    description: "Ovos com abacate e salmão.",
    category: "keto",
    calories: 580,
    protein: 38,
    carbs: 15,
    fat: 42,
    steps: ["Bata ovos.", "Cozinhe.", "Adicione abacate e salmão."],
    ingredients: [
      { name: "Ovos", grams: 180 },
      { name: "Abacate", grams: 120 },
      { name: "Salmão", grams: 80 },
    ],
  },
  {
    name: "Toast de Pão Integral com Abacate",
    description: "Pão integral com abacate.",
    category: "mediterranean",
    calories: 480,
    protein: 24,
    carbs: 42,
    fat: 26,
    steps: ["Torre pão.", "Faça puré abacate.", "Monte."],
    ingredients: [
      { name: "Pão", grams: 80 },
      { name: "Abacate", grams: 100 },
      { name: "Ovo", grams: 60 },
    ],
  },
  {
    name: "Smoothie Verde Proteico",
    description: "Smoothie verde com proteína.",
    category: "high-protein",
    calories: 420,
    protein: 32,
    carbs: 48,
    fat: 14,
    steps: ["Bata tudo."],
    ingredients: [
      { name: "Espinafres", grams: 60 },
      { name: "Banana", grams: 120 },
      { name: "Proteína", grams: 30 },
    ],
  },
  {
    name: "Shakshuka - Ovos em Molho",
    description: "Ovos em molho de tomate.",
    category: "mediterranean",
    calories: 520,
    protein: 28,
    carbs: 38,
    fat: 28,
    steps: ["Refogue cebola.", "Adicione tomate.", "Coloque ovos."],
    ingredients: [
      { name: "Ovos", grams: 180 },
      { name: "Tomate", grams: 400 },
    ],
  },
  {
    name: "Breakfast Bowl de Quinoa",
    description: "Quinoa com frutas.",
    category: "vegetarian",
    calories: 490,
    protein: 16,
    carbs: 62,
    fat: 22,
    steps: ["Cozinhe quinoa.", "Decore."],
    ingredients: [
      { name: "Quinoa", grams: 100 },
      { name: "Leite coco", grams: 250 },
    ],
  },
  {
    name: "Bagel com Ricota e Salmão",
    description: "Bagel com ricota e salmão.",
    category: "high-protein",
    calories: 520,
    protein: 34,
    carbs: 48,
    fat: 22,
    steps: ["Torre bagel.", "Adicione ricota e salmão."],
    ingredients: [
      { name: "Bagel", grams: 100 },
      { name: "Ricota", grams: 100 },
      { name: "Salmão", grams: 80 },
    ],
  },
];

const categories = [
  "low-carb",
  "mediterranean",
  "vegetarian",
  "keto",
  "paleo",
  "high-protein",
  "balanced",
];
const proteins = [
  "Frango",
  "Salmão",
  "Atum",
  "Boi",
  "Peru",
  "Ovos",
  "Tofu",
  "Gambas",
];
const bases = [
  "Arroz integral",
  "Batata-doce",
  "Massa integral",
  "Quinoa",
  "Batata",
];
const sides = [
  "Verduras",
  "Salada",
  "Brócolos",
  "Espinafres",
  "Aspargos",
  "Courgette",
];

for (let i = 0; i < 190; i++) {
  const cat = categories[i % categories.length];
  const protein = proteins[i % proteins.length];
  const base = bases[i % bases.length];
  const side = sides[i % sides.length];
  const baseCal = cat === "keto" ? 550 : cat === "low-carb" ? 450 : 480;
  const variant = i % 5;
  RECIPES.push({
    name: `${protein} ${cat} com ${base}`,
    description: `${protein} com ${base} e ${side}. Dieta ${cat}.`,
    category: cat,
    calories: baseCal + variant * 20,
    protein: 25 + variant * 3,
    carbs: cat === "low-carb" ? 15 : 45,
    fat: 15 + variant * 2,
    steps: [`Prepare ${protein}.`, "Cozinhe.", "Sirva."],
    ingredients: [
      { name: protein, grams: 150 },
      { name: base, grams: 120 },
      { name: side, grams: 100 },
    ],
  });
}

const images: Record<string, string> = {
  "high-protein":
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  "low-carb":
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
  mediterranean:
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
  vegetarian:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  keto: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
  paleo:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  balanced:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
};

async function seed() {
  console.log(`Seeding ${RECIPES.length} recipes...`);
  for (const r of RECIPES) {
    const slug = r.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80);
    const img = images[r.category] || images.balanced;
    await prisma.recipe.upsert({
      where: { name: r.name },
      create: {
        name: r.name,
        description: r.description,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        steps: r.steps,
        slug,
        category: r.category,
        photoUrl: img,
        imageUrls: [img],
        source: "seed",
        tiempoPreparacion: 25,
        porciones: 2,
        ingredients: { create: r.ingredients },
      },
      update: {
        description: r.description,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        steps: r.steps,
        slug,
        category: r.category,
        photoUrl: img,
        imageUrls: [img],
        ingredients: { deleteMany: {}, create: r.ingredients },
      },
    });
  }
  console.log(`Done! Total: ${await prisma.recipe.count()}`);
  await prisma.$disconnect();
}
seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
