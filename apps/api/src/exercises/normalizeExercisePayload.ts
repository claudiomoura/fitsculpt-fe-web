export type ExerciseRow = {
  id: string;
  sourceId?: string | null;
  slug?: string | null;
  name: string;
  equipment: string | null;
  imageUrls?: string[] | null;
  description: string | null;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  technique?: string | null;
  tips?: string | null;
  mainMuscleGroup?: string | null;
  secondaryMuscleGroups?: string[] | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExerciseApiDto = {
  id: string;
  slug: string;
  name: string;
  sourceId: string | null;
  equipment: string | null;
  imageUrls: string[];
  imageUrl: string | null;
  mainMuscleGroup: string | null;
  secondaryMuscleGroups: string[];
  description: string | null;
  mediaUrl: string | null;
  technique: string | null;
  tips: string | null;
};

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeExercisePayload(exercise: ExerciseRow): ExerciseApiDto {
  const main =
    typeof exercise.mainMuscleGroup === "string" && exercise.mainMuscleGroup.trim()
      ? exercise.mainMuscleGroup
      : Array.isArray(exercise.primaryMuscles)
        ? exercise.primaryMuscles.find((muscle) => typeof muscle === "string" && muscle.trim())
        : null;

  const secondarySource = Array.isArray(exercise.secondaryMuscleGroups)
    ? exercise.secondaryMuscleGroups
    : Array.isArray(exercise.secondaryMuscles)
      ? exercise.secondaryMuscles
      : [];

  const secondaryMuscleGroups = secondarySource.filter(
    (muscle): muscle is string => typeof muscle === "string" && muscle.trim().length > 0
  );

  const normalizedImageUrls = (exercise.imageUrls ?? []).filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0
  );
  const normalizedImageUrl =
    (typeof exercise.imageUrl === "string" && exercise.imageUrl.trim().length > 0
      ? exercise.imageUrl
      : null) ?? normalizedImageUrls[0] ?? null;

  return {
    id: exercise.id,
    slug: exercise.slug ?? slugifyName(exercise.name),
    name: exercise.name,
    sourceId: exercise.sourceId ?? null,
    equipment: exercise.equipment ?? null,
    imageUrls: normalizedImageUrls,
    imageUrl: normalizedImageUrl,
    description: exercise.description ?? null,
    mediaUrl: exercise.mediaUrl ?? null,
    technique: exercise.technique ?? null,
    tips: exercise.tips ?? null,
    mainMuscleGroup: main ?? null,
    secondaryMuscleGroups,
  };
}
