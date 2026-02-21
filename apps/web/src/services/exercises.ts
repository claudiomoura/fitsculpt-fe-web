import type { Exercise } from "@/lib/types";

export type { Exercise };

type ExerciseFiltersMetadata = {
  equipment?: string[] | null;
  primaryMuscle?: string[] | null;
};

type ExerciseListPayload = {
  items?: Exercise[];
  data?: Exercise[];
  total?: number;
  page?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  filters?: ExerciseFiltersMetadata | null;
};

export type ExerciseListQuery = {
  query?: string;
  equipment?: string;
  muscle?: string;
  limit?: number;
  page?: number;
};

export type ExerciseListResult = {
  items: Exercise[];
  total?: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: {
    equipment: string[];
    primaryMuscle: string[];
  };
};

type UnknownExercise = Exercise & Record<string, unknown>;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function normalizeSource(value: unknown): string | null {
  const text = asText(value);
  return text ? text.trim().toLowerCase() : null;
}

function getExerciseUserId(exercise: Exercise): string | null {
  const rawExercise = exercise as UnknownExercise;
  return asText(rawExercise.userId);
}

function getIsUserCreated(exercise: Exercise): boolean | null {
  const rawExercise = exercise as UnknownExercise;
  return asBoolean(rawExercise.isUserCreated);
}

function getExerciseSource(exercise: Exercise): string | null {
  const rawExercise = exercise as UnknownExercise;
  return normalizeSource(rawExercise.source);
}

function getExerciseSourceId(exercise: Exercise): string | null {
  return normalizeSource(exercise.sourceId);
}

function isUserSource(source: string | null): boolean {
  if (!source) return false;
  return ["user", "custom", "trainer", "manual"].includes(source);
}

function sourceIdSignalsUserOwnership(sourceId: string | null, viewerUserId: string | null): boolean {
  if (!sourceId) return false;
  if (sourceId.startsWith("user:") || sourceId.startsWith("user_")) return true;
  if (sourceId.startsWith("custom:") || sourceId.startsWith("manual:")) return true;
  if (viewerUserId && (sourceId.endsWith(`:${viewerUserId.toLowerCase()}`) || sourceId === viewerUserId.toLowerCase())) {
    return true;
  }
  return false;
}

export function isExerciseOwnedByUser(exercise: Exercise, viewerUserId: string | null): boolean {
  const isUserCreated = getIsUserCreated(exercise);
  if (isUserCreated === true) {
    return true;
  }

  const source = getExerciseSource(exercise);
  if (isUserSource(source)) {
    return true;
  }

  const sourceId = getExerciseSourceId(exercise);
  if (sourceIdSignalsUserOwnership(sourceId, viewerUserId)) {
    return true;
  }

  const exerciseUserId = getExerciseUserId(exercise);
  if (viewerUserId && exerciseUserId && exerciseUserId === viewerUserId) {
    return true;
  }

  return false;
}

export type ExercisesByOwnership = {
  fitsculptExercises: Exercise[];
  gymExercises: Exercise[];
  unclassifiedExercises: Exercise[];
  supportsScopedSections: boolean;
};

function getExerciseGymId(exercise: Exercise): string | null {
  const rawExercise = exercise as UnknownExercise;
  const gym = rawExercise.gym as UnknownExercise | undefined;
  const tenant = rawExercise.tenant as UnknownExercise | undefined;
  const owner = rawExercise.owner as UnknownExercise | undefined;

  return (
    asText(rawExercise.ownerGymId) ??
    asText(rawExercise.gymId) ??
    asText(rawExercise.createdByGymId) ??
    asText(rawExercise.tenantId) ??
    asText(rawExercise.organizationId) ??
    asText(gym?.id) ??
    asText(gym?.gymId) ??
    asText(tenant?.id) ??
    asText(tenant?.gymId) ??
    asText(owner?.gymId) ??
    null
  );
}

function getExerciseScope(exercise: Exercise): string | null {
  const rawExercise = exercise as UnknownExercise;
  return normalizeSource(rawExercise.scope);
}

function getExerciseVisibility(exercise: Exercise): string | null {
  const rawExercise = exercise as UnknownExercise;
  return normalizeSource(rawExercise.visibility);
}

function getIsPublic(exercise: Exercise): boolean | null {
  const rawExercise = exercise as UnknownExercise;
  return asBoolean(rawExercise.isPublic);
}

function hasScopedSignals(exercise: Exercise): boolean {
  const rawExercise = exercise as UnknownExercise;
  return (
    "ownerGymId" in rawExercise ||
    "gymId" in rawExercise ||
    "createdByGymId" in rawExercise ||
    "scope" in rawExercise ||
    "visibility" in rawExercise ||
    "isPublic" in rawExercise ||
    "isGlobal" in rawExercise
  );
}

function isGlobalExerciseByScope(exercise: Exercise): boolean {
  const rawExercise = exercise as UnknownExercise;
  const scope = getExerciseScope(exercise);
  const visibility = getExerciseVisibility(exercise);
  const source = getExerciseSource(exercise);
  const isPublic = getIsPublic(exercise);
  const isGlobal = asBoolean(rawExercise.isGlobal);

  if (isPublic === true || isGlobal === true) return true;
  if (scope && ["global", "public", "fitsculpt", "system"].includes(scope)) return true;
  if (visibility && ["global", "public", "fitsculpt", "shared"].includes(visibility)) return true;
  if (source && ["fitsculpt", "global", "system", "default", "public"].includes(source)) return true;

  return false;
}

export function splitExercisesByOwnership(
  exercises: Exercise[],
  viewerUserId: string | null,
  membership?: { gymId?: string | null } | null
): ExercisesByOwnership {
  void viewerUserId;
  const gymExercises: Exercise[] = [];
  const fitsculptExercises: Exercise[] = [];
  const unclassifiedExercises: Exercise[] = [];
  const viewerGymId = membership?.gymId ?? null;

  let supportsScopedSections = false;

  const allHaveScopedSignals = exercises.length > 0 && exercises.every(hasScopedSignals);

  for (const exercise of exercises) {
    const exerciseGymId = getExerciseGymId(exercise);
    const globalByScope = isGlobalExerciseByScope(exercise);
    const hasScope = hasScopedSignals(exercise);

    if (hasScope) {
      supportsScopedSections = true;
    }

    if (globalByScope) {
      fitsculptExercises.push(exercise);
      continue;
    }

    if (viewerGymId && exerciseGymId === viewerGymId) {
      gymExercises.push(exercise);
      continue;
    }

    if (!viewerGymId && exerciseGymId) {
      gymExercises.push(exercise);
      continue;
    }

    if (!allHaveScopedSignals) {
      unclassifiedExercises.push(exercise);
      continue;
    }

    if (getIsPublic(exercise) === false) {
      gymExercises.push(exercise);
      continue;
    }

    unclassifiedExercises.push(exercise);
  }

  return { fitsculptExercises, gymExercises, unclassifiedExercises, supportsScopedSections };
}

function sanitizeOptions(values?: string[] | null) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

export async function fetchExercisesList(params: ExerciseListQuery, signal?: AbortSignal): Promise<ExerciseListResult> {
  const search = new URLSearchParams();
  const page = Number(params.page ?? 1);
  const limit = Number(params.limit ?? 24);

  if (params.query?.trim()) search.set("query", params.query.trim());
  if (params.equipment?.trim()) search.set("equipment", params.equipment.trim());
  if (params.muscle?.trim()) search.set("muscle", params.muscle.trim());
  search.set("offset", String((Math.max(page, 1) - 1) * limit));
  search.set("page", String(page));
  search.set("limit", String(limit));

  const response = await fetch(`/api/exercises?${search.toString()}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("EXERCISES_LIST_REQUEST_FAILED");
  }

  const payload = (await response.json()) as ExerciseListPayload;
  const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
  const total = typeof payload.total === "number" ? payload.total : undefined;
  const responsePage =
    typeof payload.page === "number" && Number.isFinite(payload.page)
      ? payload.page
      : typeof payload.offset === "number" && Number.isFinite(payload.offset)
        ? Math.floor(payload.offset / Math.max(limit, 1)) + 1
        : page;
  const responseLimit = typeof payload.limit === "number" && Number.isFinite(payload.limit) ? payload.limit : limit;
  const filterEquipment = sanitizeOptions(payload.filters?.equipment);
  const filterPrimaryMuscle = sanitizeOptions(payload.filters?.primaryMuscle);
  const derivedEquipment = sanitizeOptions(
    items
      .map((item) => item.equipment)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  );
  const derivedPrimaryMuscle = sanitizeOptions(
    items
      .map((item) => item.mainMuscleGroup)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  );

  const hasMore =
    typeof payload.hasMore === "boolean"
      ? payload.hasMore
      : typeof payload.nextCursor === "string"
        ? payload.nextCursor.length > 0
        : typeof total === "number"
          ? responsePage * responseLimit < total
          : items.length >= responseLimit;

  return {
    items,
    total,
    page: responsePage,
    limit: responseLimit,
    hasMore,
    filters: {
      equipment: filterEquipment.length > 0 ? filterEquipment : derivedEquipment,
      primaryMuscle: filterPrimaryMuscle.length > 0 ? filterPrimaryMuscle : derivedPrimaryMuscle,
    },
  };
}
