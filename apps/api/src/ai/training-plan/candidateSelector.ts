import type { Prisma, Exercise } from "@prisma/client";
import type { UserContext } from "./contextResolver.js";

export type CandidateExercise = {
  id: string;
  name: string;
  imageUrl?: string | null;
  equipment?: string | null;
  mainMuscleGroup?: string | null;
};

// Map day focus labels to target muscle groups
const MUSCLE_GROUP_MAP: Record<string, string[]> = {
  // Upper body push
  "Tren superior (empuje)": ["chest", "shoulders", "triceps"],
  "Empuje (Pecho/Hombro/Tríceps)": ["chest", "shoulders", "triceps"],
  
  // Upper body pull
  "Tren superior (tirón)": ["back", "biceps", "forearms"],
  "Tren superior (mixto)": ["chest", "back", "shoulders", "biceps", "triceps"],
  "Tirón (Espalda/Bíceps)": ["back", "biceps", "forearms"],
  
  // Lower body
  "Tren inferior (cuádriceps dominante)": ["quads"],
  "Tren inferior (posterior dominante)": ["hamstrings", "glutes"],
  "Tren inferior (mixto)": ["quads", "hamstrings", "glutes"],
  "Pierna + Core": ["quads", "hamstrings", "glutes", "core"],
  "Pierna posterior + Glúteo": ["hamstrings", "glutes"],
  
  // Full body
  "Full body (empuje + tirón + pierna)": ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes"],
  "Full body (pierna + empuje + core)": ["quads", "hamstrings", "glutes", "chest", "shoulders", "triceps", "core"],
  "Full body (tirón + pierna + empuje)": ["back", "biceps", "forearms", "quads", "hamstrings", "glutes", "chest", "shoulders", "triceps"],
  "Full body (pierna + tirón + core)": ["quads", "hamstrings", "glutes", "back", "biceps", "forearms", "core"],
  "Full body (empuje + pierna + tirón)": ["chest", "shoulders", "triceps", "quads", "hamstrings", "glutes", "back", "biceps", "forearms"],
  "Full body (tirón + empuje + pierna)": ["back", "biceps", "forearms", "chest", "shoulders", "triceps", "quads", "hamstrings", "glutes"],
  "Full body (pierna + empuje + tirón)": ["quads", "hamstrings", "glutes", "chest", "shoulders", "triceps", "back", "biceps", "forearms"],
  "Full body técnico": ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "core"],
};

/**
 * Selects candidate exercises from the database based on user context
 */
export async function selectCandidateExercises(
  prisma: Prisma.TransactionClient,
  context: UserContext,
  dayFocus?: string,
  limit: number = 20
): Promise<CandidateExercise[]> {
  // Build where clause based on user's equipment and focus
  const where: Prisma.ExerciseWhereInput = {};
  
  // Filter by equipment if specified
  if (context.equipment) {
    // For simplicity, we'll match exact equipment or allow null (bodyweight exercises)
    where.OR = [
      { equipment: context.equipment },
      { equipment: null },
    ];
  }
  
  // Filter by muscle group if day focus is specified and not full body
  if (dayFocus) {
    const targetMuscleGroups = MUSCLE_GROUP_MAP[dayFocus];
    if (targetMuscleGroups && targetMuscleGroups.length > 0) {
      // If it's not full body (all muscles), add the filter
      where.mainMuscleGroup = { in: targetMuscleGroups };
    }
  }

  // Get exercises from database
  const exercises = await prisma.exercise.findMany({
    where,
    select: {
      id: true,
      name: true,
      imageUrls: true, // We'll take the first one or null
      equipment: true,
      mainMuscleGroup: true,
    },
    orderBy: { name: 'asc' },
    take: limit,
  });

  // Map to our CandidateExercise format
  return exercises.map(exercise => ({
    id: exercise.id,
    name: exercise.name,
    imageUrl: exercise.imageUrls?.[0] ?? null,
    equipment: exercise.equipment,
    mainMuscleGroup: exercise.mainMuscleGroup,
  }));
}