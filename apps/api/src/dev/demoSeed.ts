import { type PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEMO_USER_ID = "demo-user-fitsculpt";
const DEMO_WORKOUT_ID = "demo-workout-today-1";
const DEMO_TRAINING_PLAN_ID = "demo-training-plan-core";
const DEMO_NUTRITION_PLAN_ID = "demo-nutrition-plan-core";
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo.user@fitsculpt.local";
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "DemoUser123!";
const DEMO_USER_NAME = process.env.DEMO_USER_NAME ?? "Demo User";
const BCRYPT_DEMO_SALT = "$2a$10$CwTycUXWue0Thq9StjUM0u";

const DEMO_RECIPES = [
  {
    name: "DEMO: Bowl de pollo mediterráneo",
    description: "Bowl alto en proteína con vegetales frescos.",
    calories: 620,
    protein: 44,
    carbs: 58,
    fat: 22,
    steps: ["Cocinar pechuga a la plancha", "Mezclar quinoa y verduras", "Montar bowl y aliñar"],
    ingredients: [
      { name: "Pechuga de pollo", grams: 180 },
      { name: "Quinoa cocida", grams: 180 },
      { name: "Pepino", grams: 80 },
      { name: "Tomate", grams: 100 },
    ],
  },
  {
    name: "DEMO: Avena proteica con frutas",
    description: "Desayuno rápido para energía sostenida.",
    calories: 480,
    protein: 35,
    carbs: 54,
    fat: 13,
    steps: ["Cocinar avena con leche", "Añadir proteína", "Servir con fruta"],
    ingredients: [
      { name: "Avena", grams: 70 },
      { name: "Leche semidesnatada", grams: 220 },
      { name: "Proteína en polvo", grams: 30 },
      { name: "Plátano", grams: 90 },
    ],
  },
] as const;

const DEMO_EXERCISES = [
  {
    slug: "demo-barbell-back-squat",
    name: "Sentadilla trasera con barra",
    sourceId: "demo-barbell-back-squat",
    mainMuscleGroup: "Piernas",
    secondaryMuscleGroups: ["Glúteos", "Core"],
    equipment: "Barra",
    description: "Ejercicio base para fuerza de tren inferior.",
    technique: "Baja en control hasta paralelo y sube empujando el suelo.",
    tips: "Mantén el tronco estable y las rodillas alineadas.",
    imageUrls: ["https://images.pexels.com/photos/6550854/pexels-photo-6550854.jpeg"],
  },
  {
    slug: "demo-dumbbell-bench-press",
    name: "Press banca con mancuernas",
    sourceId: "demo-dumbbell-bench-press",
    mainMuscleGroup: "Pecho",
    secondaryMuscleGroups: ["Hombros", "Tríceps"],
    equipment: "Mancuernas",
    description: "Empuje horizontal para tren superior.",
    technique: "Desciende mancuernas al nivel del pecho y empuja en vertical.",
    tips: "Mantén escápulas retraídas durante la serie.",
    imageUrls: ["https://images.pexels.com/photos/4162487/pexels-photo-4162487.jpeg"],
  },
  {
    slug: "demo-lat-pulldown",
    name: "Jalón al pecho",
    sourceId: "demo-lat-pulldown",
    mainMuscleGroup: "Espalda",
    secondaryMuscleGroups: ["Bíceps"],
    equipment: "Polea",
    description: "Tirón vertical para dorsales.",
    technique: "Lleva la barra hacia la parte alta del pecho.",
    tips: "Evita balancear el torso para mantener tensión.",
    imageUrls: ["https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg"],
  },
  {
    slug: "demo-romanian-deadlift",
    name: "Peso muerto rumano",
    sourceId: "demo-romanian-deadlift",
    mainMuscleGroup: "Isquiotibiales",
    secondaryMuscleGroups: ["Glúteos", "Espalda baja"],
    equipment: "Barra",
    description: "Bisagra de cadera para cadena posterior.",
    technique: "Desliza la barra cerca de las piernas con espalda neutra.",
    tips: "Mantén ligera flexión de rodilla.",
    imageUrls: ["https://images.pexels.com/photos/949130/pexels-photo-949130.jpeg"],
  },
  {
    slug: "demo-overhead-press",
    name: "Press militar",
    sourceId: "demo-overhead-press",
    mainMuscleGroup: "Hombros",
    secondaryMuscleGroups: ["Tríceps", "Core"],
    equipment: "Barra",
    description: "Empuje vertical para hombro y estabilidad.",
    technique: "Empuja la barra en línea recta sobre la cabeza.",
    tips: "Aprieta glúteos y abdomen durante todo el movimiento.",
    imageUrls: ["https://images.pexels.com/photos/3836861/pexels-photo-3836861.jpeg"],
  },
] as const;

export async function resetDemoState(prisma: PrismaClient) {
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, BCRYPT_DEMO_SALT);

  await prisma.$transaction(async (tx) => {
    await tx.workout.deleteMany({ where: { id: DEMO_WORKOUT_ID } });
    await tx.trainingPlan.deleteMany({ where: { id: DEMO_TRAINING_PLAN_ID } });
    await tx.nutritionPlan.deleteMany({ where: { id: DEMO_NUTRITION_PLAN_ID } });
    await tx.user.deleteMany({ where: { email: DEMO_USER_EMAIL } });

    await tx.recipe.deleteMany({ where: { name: { startsWith: "DEMO:" } } });
    await tx.exercise.deleteMany({ where: { source: "demo-seed" } });

    for (const exercise of DEMO_EXERCISES) {
      await tx.exercise.create({
        data: {
          slug: exercise.slug,
          source: "demo-seed",
          sourceId: exercise.sourceId,
          name: exercise.name,
          mainMuscleGroup: exercise.mainMuscleGroup,
          secondaryMuscleGroups: [...exercise.secondaryMuscleGroups],
          equipment: exercise.equipment,
          description: exercise.description,
          technique: exercise.technique,
          tips: exercise.tips,
          imageUrls: [...exercise.imageUrls],
          imageUrl: exercise.imageUrls[0],
          mediaUrl: exercise.imageUrls[0],
        },
      });
    }

    for (const recipe of DEMO_RECIPES) {
      await tx.recipe.create({
        data: {
          name: recipe.name,
          description: recipe.description,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          steps: [...recipe.steps],
          ingredients: {
            create: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
          },
        },
      });
    }

    const demoUser = await tx.user.create({
      data: {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        passwordHash,
        name: DEMO_USER_NAME,
        provider: "email",
        role: "USER",
        plan: "PRO",
        emailVerifiedAt: now,
      },
    });

    await tx.userProfile.upsert({
      where: { userId: demoUser.id },
      create: {
        userId: demoUser.id,
        tracking: {
          checkins: [],
          weights: [],
          photos: [],
          workouts: [],
        },
      },
      update: {
        tracking: {
          checkins: [],
          weights: [],
          photos: [],
          workouts: [],
        },
      },
    });

    await tx.trainingPlan.create({
      data: {
        id: DEMO_TRAINING_PLAN_ID,
        userId: demoUser.id,
        title: "DEMO: Plan Fuerza Base",
        notes: "Plan de demo para flujo Hoy → acción.",
        goal: "Ganar fuerza",
        level: "Intermedio",
        daysPerWeek: 3,
        focus: "Cuerpo completo",
        equipment: "Gimnasio",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        daysCount: 3650,
        days: {
          create: [
            {
              date: now,
              label: "Día A",
              focus: "Pierna + empuje",
              duration: 50,
              order: 1,
              exercises: {
                create: [
                  { name: "Sentadilla trasera con barra", sets: 4, reps: "6" },
                  { name: "Press banca con mancuernas", sets: 4, reps: "8" },
                ],
              },
            },
          ],
        },
      },
    });

    await tx.nutritionPlan.create({
      data: {
        id: DEMO_NUTRITION_PLAN_ID,
        userId: demoUser.id,
        title: "DEMO: Plan mantenimiento",
        dailyCalories: 2300,
        proteinG: 170,
        fatG: 70,
        carbsG: 240,
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        daysCount: 3650,
        days: {
          create: [
            {
              date: now,
              dayLabel: "Hoy",
              order: 1,
              meals: {
                create: [
                  {
                    type: "BREAKFAST",
                    title: "Avena proteica",
                    calories: 480,
                    protein: 35,
                    carbs: 54,
                    fats: 13,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    await tx.workout.create({
      data: {
        id: DEMO_WORKOUT_ID,
        userId: demoUser.id,
        name: "DEMO: Sesión de hoy",
        scheduledAt: now,
        durationMin: 45,
        notes: "Lista para completar en demo.",
        exercises: {
          create: [
            {
              name: "Sentadilla trasera con barra",
              sets: "4",
              reps: "6",
              order: 1,
            },
            {
              name: "Press militar",
              sets: "3",
              reps: "8",
              order: 2,
            },
          ],
        },
      },
    });
  });

  return {
    userEmail: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    exercisesSeeded: DEMO_EXERCISES.length,
    recipesSeeded: DEMO_RECIPES.length,
    trainingPlanId: DEMO_TRAINING_PLAN_ID,
    nutritionPlanId: DEMO_NUTRITION_PLAN_ID,
    workoutId: DEMO_WORKOUT_ID,
  };
}
