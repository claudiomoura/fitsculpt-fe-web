export type TrainerExerciseCapabilities = {
  createExercise: "can_create" | "cannot_create" | "unknown";
  canUploadMedia: boolean;
};

async function supportsExercisesRead(): Promise<boolean> {
  try {
    const response = await fetch("/api/exercises?limit=1", { method: "GET", cache: "no-store" });
    return response.ok;
  } catch (_err) {
    return false;
  }
}

async function supportsExerciseCreate(): Promise<"can_create" | "cannot_create" | "unknown"> {
  const canReadExercises = await supportsExercisesRead();
  return canReadExercises ? "can_create" : "unknown";
}

export async function auditTrainerExerciseCapabilities(): Promise<TrainerExerciseCapabilities> {
  const canReadExercises = await supportsExercisesRead();
  const createExercise = canReadExercises ? await supportsExerciseCreate() : "cannot_create";

  return {
    createExercise,
    canUploadMedia: false,
  };
}
