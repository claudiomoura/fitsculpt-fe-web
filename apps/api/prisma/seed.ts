import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ExerciseSeed = {
  name: string;
  mainMuscleGroup: string;
  secondaryMuscleGroups: string[];
  equipment: string | null;
  description: string;
  technique: string;
  tips: string;
};

type RecipeSeed = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl?: string | null;
  steps: string[];
  ingredients: Array<{ name: string; grams: number }>;
};

const seedDir = dirname(fileURLToPath(import.meta.url));
const exercises = JSON.parse(
  readFileSync(join(seedDir, "data/exercises.json"), "utf8")
) as ExerciseSeed[];

const recipes: RecipeSeed[] = [
  {
    name: "Salmón con espárragos y arroz",
    description: "Plato completo con proteína y carbohidratos complejos.",
    calories: 620,
    protein: 42,
    carbs: 55,
    fat: 22,
    steps: ["Cocina el arroz", "Saltea espárragos", "Marca el salmón a la plancha"],
    ingredients: [
      { name: "Salmón", grams: 160 },
      { name: "Arroz integral cocido", grams: 180 },
      { name: "Espárragos", grams: 120 },
    ],
  },
  {
    name: "Pollo con patata y verduras",
    description: "Comida clásica alta en proteína.",
    calories: 680,
    protein: 50,
    carbs: 60,
    fat: 18,
    steps: ["Asa la patata", "Cocina el pollo a la plancha", "Saltea las verduras"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 180 },
      { name: "Patata", grams: 220 },
      { name: "Verduras mixtas", grams: 150 },
    ],
  },
  {
    name: "Avena con yogur y frutos rojos",
    description: "Desayuno rápido con buena saciedad.",
    calories: 430,
    protein: 24,
    carbs: 55,
    fat: 12,
    steps: ["Mezcla avena y yogur", "Añade frutos rojos"],
    ingredients: [
      { name: "Avena", grams: 60 },
      { name: "Yogur griego", grams: 180 },
      { name: "Frutos rojos", grams: 100 },
    ],
  },
  {
    name: "Tortilla de claras con espinacas",
    description: "Desayuno alto en proteína.",
    calories: 320,
    protein: 30,
    carbs: 15,
    fat: 10,
    steps: ["Saltea espinacas", "Añade claras y cocina a fuego medio"],
    ingredients: [
      { name: "Claras de huevo", grams: 200 },
      { name: "Espinacas", grams: 80 },
      { name: "Aceite de oliva", grams: 5 },
    ],
  },
  {
    name: "Ensalada de quinoa y garbanzos",
    description: "Opción vegetal con proteína completa.",
    calories: 520,
    protein: 22,
    carbs: 70,
    fat: 14,
    steps: ["Cuece quinoa", "Mezcla con garbanzos y verduras"],
    ingredients: [
      { name: "Quinoa cocida", grams: 180 },
      { name: "Garbanzos cocidos", grams: 120 },
      { name: "Verduras mixtas", grams: 120 },
    ],
  },
  {
    name: "Ternera salteada con arroz",
    description: "Comida energética para volumen.",
    calories: 720,
    protein: 45,
    carbs: 75,
    fat: 22,
    steps: ["Saltea la ternera", "Añade verduras", "Sirve con arroz"],
    ingredients: [
      { name: "Ternera magra", grams: 170 },
      { name: "Arroz jazmín cocido", grams: 200 },
      { name: "Pimiento y cebolla", grams: 100 },
    ],
  },
  {
    name: "Pavo con boniato al horno",
    description: "Combinación dulce-salada rica en fibra.",
    calories: 640,
    protein: 46,
    carbs: 65,
    fat: 16,
    steps: ["Asa boniato", "Cocina el pavo a la plancha"],
    ingredients: [
      { name: "Pavo", grams: 180 },
      { name: "Boniato", grams: 220 },
      { name: "Aceite de oliva", grams: 6 },
    ],
  },
  {
    name: "Bowl de tofu y verduras",
    description: "Opción vegana con proteína vegetal.",
    calories: 540,
    protein: 28,
    carbs: 55,
    fat: 20,
    steps: ["Dora el tofu", "Saltea verduras", "Sirve con arroz"],
    ingredients: [
      { name: "Tofu", grams: 180 },
      { name: "Arroz integral cocido", grams: 160 },
      { name: "Verduras mixtas", grams: 150 },
    ],
  },
  {
    name: "Pasta integral con atún",
    description: "Comida rápida post entrenamiento.",
    calories: 650,
    protein: 40,
    carbs: 80,
    fat: 12,
    steps: ["Cuece pasta", "Mezcla con atún y tomate"],
    ingredients: [
      { name: "Pasta integral cocida", grams: 200 },
      { name: "Atún al natural", grams: 120 },
      { name: "Tomate triturado", grams: 100 },
    ],
  },
  {
    name: "Wrap de pollo y aguacate",
    description: "Almuerzo práctico para llevar.",
    calories: 560,
    protein: 35,
    carbs: 45,
    fat: 22,
    steps: ["Cocina el pollo", "Rellena el wrap con aguacate y verduras"],
    ingredients: [
      { name: "Tortilla integral", grams: 60 },
      { name: "Pechuga de pollo", grams: 140 },
      { name: "Aguacate", grams: 60 },
    ],
  },
  {
    name: "Merluza al horno con verduras",
    description: "Cena ligera y rica en omega 3.",
    calories: 480,
    protein: 38,
    carbs: 35,
    fat: 14,
    steps: ["Hornea la merluza", "Asa verduras"],
    ingredients: [
      { name: "Merluza", grams: 180 },
      { name: "Verduras al horno", grams: 200 },
      { name: "Aceite de oliva", grams: 6 },
    ],
  },
  {
    name: "Lentejas con verduras",
    description: "Plato vegetariano completo.",
    calories: 560,
    protein: 28,
    carbs: 78,
    fat: 10,
    steps: ["Cuece lentejas", "Añade verduras y especias"],
    ingredients: [
      { name: "Lentejas cocidas", grams: 220 },
      { name: "Zanahoria y apio", grams: 120 },
      { name: "Tomate", grams: 80 },
    ],
  },
  {
    name: "Arroz con huevo y verduras",
    description: "Opción rápida con proteínas mixtas.",
    calories: 520,
    protein: 22,
    carbs: 70,
    fat: 12,
    steps: ["Saltea verduras", "Añade arroz y huevo"],
    ingredients: [
      { name: "Arroz cocido", grams: 180 },
      { name: "Huevo", grams: 100 },
      { name: "Verduras mixtas", grams: 120 },
    ],
  },
  {
    name: "Yogur con granola y plátano",
    description: "Snack energético con fibra.",
    calories: 390,
    protein: 18,
    carbs: 55,
    fat: 10,
    steps: ["Sirve yogur", "Añade granola y plátano"],
    ingredients: [
      { name: "Yogur natural", grams: 180 },
      { name: "Granola", grams: 40 },
      { name: "Plátano", grams: 100 },
    ],
  },
  {
    name: "Filete de cerdo con couscous",
    description: "Comida completa y saciante.",
    calories: 670,
    protein: 42,
    carbs: 68,
    fat: 20,
    steps: ["Cocina el couscous", "Sella el filete", "Sirve con verduras"],
    ingredients: [
      { name: "Lomo de cerdo", grams: 180 },
      { name: "Couscous cocido", grams: 180 },
      { name: "Verduras mixtas", grams: 120 },
    ],
  },
  {
    name: "Buddha bowl mediterráneo",
    description: "Bowl vegetal con grasas saludables.",
    calories: 590,
    protein: 24,
    carbs: 68,
    fat: 20,
    steps: ["Cuece arroz", "Añade garbanzos y verduras", "Aliña con aceite"],
    ingredients: [
      { name: "Arroz integral cocido", grams: 160 },
      { name: "Garbanzos cocidos", grams: 120 },
      { name: "Verduras mixtas", grams: 140 },
    ],
  },
  {
    name: "Poke de atún",
    description: "Opción fresca con carbohidratos moderados.",
    calories: 560,
    protein: 38,
    carbs: 55,
    fat: 16,
    steps: ["Prepara arroz", "Mezcla atún y verduras", "Añade salsa ligera"],
    ingredients: [
      { name: "Atún fresco", grams: 160 },
      { name: "Arroz sushi cocido", grams: 160 },
      { name: "Pepino y zanahoria", grams: 120 },
    ],
  },
  {
    name: "Hamburguesa de pavo con ensalada",
    description: "Cena alta en proteína y ligera.",
    calories: 510,
    protein: 40,
    carbs: 30,
    fat: 18,
    steps: ["Cocina la hamburguesa", "Sirve con ensalada fresca"],
    ingredients: [
      { name: "Hamburguesa de pavo", grams: 160 },
      { name: "Ensalada mixta", grams: 180 },
      { name: "Aceite de oliva", grams: 6 },
    ],
  },
  {
    name: "Sopa de verduras con pollo",
    description: "Cena reconfortante y ligera.",
    calories: 420,
    protein: 30,
    carbs: 35,
    fat: 12,
    steps: ["Cocina verduras en caldo", "Añade pollo desmenuzado"],
    ingredients: [
      { name: "Pollo cocido", grams: 140 },
      { name: "Verduras variadas", grams: 200 },
      { name: "Caldo", grams: 300 },
    ],
  },
  {
    name: "Tacos de pescado",
    description: "Comida ligera con proteína de mar.",
    calories: 570,
    protein: 35,
    carbs: 60,
    fat: 18,
    steps: ["Cocina el pescado", "Sirve en tortillas con verduras"],
    ingredients: [
      { name: "Pescado blanco", grams: 160 },
      { name: "Tortillas de maíz", grams: 80 },
      { name: "Col y tomate", grams: 120 },
    ],
  },
  {
    name: "Batido de proteína y fruta",
    description: "Snack post entreno.",
    calories: 350,
    protein: 30,
    carbs: 35,
    fat: 6,
    steps: ["Licua proteína con fruta y leche"],
    ingredients: [
      { name: "Proteína en polvo", grams: 30 },
      { name: "Leche", grams: 200 },
      { name: "Fruta", grams: 120 },
    ],
  },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  if (exercises.length < 100) {
    throw new Error(`Expected at least 100 exercises, got ${exercises.length}`);
  }
  if (recipes.length < 20) {
    throw new Error(`Expected at least 20 recipes, got ${recipes.length}`);
  }

  let seeded = 0;

  for (const exercise of exercises) {
    const slug = slugify(exercise.name);
    await prisma.exercise.upsert({
      where: { slug },
      create: {
        slug,
        name: exercise.name,
        equipment: exercise.equipment,
        description: exercise.description,
        mainMuscleGroup: exercise.mainMuscleGroup,
        secondaryMuscleGroups: exercise.secondaryMuscleGroups,
        technique: exercise.technique,
        tips: exercise.tips,
        isUserCreated: false,
      },
      update: {
        name: exercise.name,
        equipment: exercise.equipment,
        description: exercise.description,
        mainMuscleGroup: exercise.mainMuscleGroup,
        secondaryMuscleGroups: exercise.secondaryMuscleGroups,
        technique: exercise.technique,
        tips: exercise.tips,
        isUserCreated: false,
      },
    });
    seeded += 1;
  }

  const total = await prisma.exercise.count();
  console.log(`Seeded ${seeded} exercises`);
  if (total < 100) {
    throw new Error(`Seeded ${total} exercises, expected at least 100`);
  }

  let recipesSeeded = 0;
  for (const recipe of recipes) {
    const record = await prisma.recipe.upsert({
      where: { name: recipe.name },
      create: {
        name: recipe.name,
        description: recipe.description,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        photoUrl: recipe.photoUrl ?? null,
        steps: recipe.steps,
      },
      update: {
        description: recipe.description,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        photoUrl: recipe.photoUrl ?? null,
        steps: recipe.steps,
      },
    });

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: record.id } });
    if (recipe.ingredients.length > 0) {
      await prisma.recipeIngredient.createMany({
        data: recipe.ingredients.map((ingredient) => ({
          recipeId: record.id,
          name: ingredient.name,
          grams: ingredient.grams,
        })),
      });
    }
    recipesSeeded += 1;
  }

  const recipeTotal = await prisma.recipe.count();
  console.log(`Seeded ${recipesSeeded} recipes`);
  if (recipeTotal < 20) {
    throw new Error(`Seeded ${recipeTotal} recipes, expected at least 20`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
