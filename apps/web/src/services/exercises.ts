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
