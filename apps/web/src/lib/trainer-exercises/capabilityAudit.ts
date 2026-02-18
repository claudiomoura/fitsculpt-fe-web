export type TrainerExerciseCapabilities = {
  canCreateExercise: boolean;
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

async function supportsExerciseCreate(): Promise<boolean> {
  try {
    const response = await fetch("/api/exercises", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    if (response.status === 404 || response.status === 405 || response.status === 501) {
      return false;
    }

    return true;
  } catch (_err) {
    return false;
  }
}

export async function auditTrainerExerciseCapabilities(): Promise<TrainerExerciseCapabilities> {
  const canReadExercises = await supportsExercisesRead();
  const canCreateExercise = canReadExercises ? await supportsExerciseCreate() : false;

  return {
    canCreateExercise,
    canUploadMedia: false,
  };
}
