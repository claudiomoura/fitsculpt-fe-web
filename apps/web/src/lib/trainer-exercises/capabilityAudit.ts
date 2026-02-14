export type TrainerExerciseCapabilities = {
  canCreateExercise: boolean;
  canUploadMedia: boolean;
};

async function supportsReadExercises(): Promise<boolean> {
  try {
    const response = await fetch("/api/exercises?limit=1", {
      method: "GET",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function auditTrainerExerciseCapabilities(): Promise<TrainerExerciseCapabilities> {
  const canCreateExercise = false;
  const canUploadMedia = false;

  await supportsReadExercises();

  return {
    canCreateExercise,
    canUploadMedia,
  };
}
