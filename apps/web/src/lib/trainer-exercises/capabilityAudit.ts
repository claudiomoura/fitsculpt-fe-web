export type TrainerExerciseCapabilities = {
  canCreateExercise: boolean;
  canUploadMedia: boolean;
};

async function supportsMethod(path: string, method: "POST") {
  try {
    const response = await fetch(path, { method, cache: "no-store" });
    return response.status !== 404 && response.status !== 405;
  } catch {
    return false;
  }
}

export async function auditTrainerExerciseCapabilities(): Promise<TrainerExerciseCapabilities> {
  const canCreateExercise = await supportsMethod("/api/exercises", "POST");

  const uploadCandidates = ["/api/exercises/upload", "/api/media/upload", "/api/uploads"];
  let canUploadMedia = false;

  for (const endpoint of uploadCandidates) {
    if (await supportsMethod(endpoint, "POST")) {
      canUploadMedia = true;
      break;
    }
  }

  return {
    canCreateExercise,
    canUploadMedia,
  };
}
