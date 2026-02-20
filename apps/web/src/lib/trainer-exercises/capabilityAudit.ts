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

export async function auditTrainerExerciseCapabilities(): Promise<TrainerExerciseCapabilities> {
  const canReadExercises = await supportsExercisesRead();

  return {
    createExercise: canReadExercises ? "unknown" : "cannot_create",
    canUploadMedia: false,
  };
}
