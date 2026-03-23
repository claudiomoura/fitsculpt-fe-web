import type { Prisma, Exercise } from "@prisma/client";
import type { UserContext } from "./contextResolver.js";

export type CandidateExercise = {
  id: string;
  name: string;
  imageUrl?: string | null;
  equipment?: string | null;
  mainMuscleGroup?: string | null;
};

/**
 * Selects candidate exercises from the database based on user context
 */
export async function selectCandidateExercises(
  prisma: Prisma.TransactionClient,
  context: UserContext,
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
  
  // For focus, we could filter by mainMuscleGroup, but we'll keep it simple for now
  // and let the AI selector handle the focus matching
  // In a more advanced version, we would map focus to muscle groups
  
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