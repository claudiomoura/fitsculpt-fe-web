import { z } from "zod";

export const exerciseSelectionResponseSchema = z.object({
  exerciseId: z.string().min(1, "exerciseId must be a non-empty string"),
});

export type ExerciseSelectionResponse = z.infer<typeof exerciseSelectionResponseSchema>;

export function validateExerciseSelectionResponse(
  data: unknown,
): { success: true; data: ExerciseSelectionResponse } | { success: false; error: string } {
  const result = exerciseSelectionResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
  return { success: false, error: `Invalid exercise selection response: ${errorMessages}` };
}