export type TrainerExerciseCapabilities = {
  canCreateExercise: boolean;
  canUploadMedia: boolean;
};

async function supportsExercisesRead(): Promise<boolean> {
  try {
    const response = await fetch("/api/exercises?limit=1", { method: "GET", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function auditTrainerExerciseCapabilities(): Promise<TrainerExerciseCapabilities> {
  const canReadExercises = await supportsExercisesRead();

  return {
    canCreateExercise: canReadExercises,
    canUploadMedia: false,
  };
}
