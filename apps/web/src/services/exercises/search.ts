import type { Exercise } from "@/lib/types";
import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";

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

export type ExerciseSearchQuery = {
  query?: string;
  equipment?: string;
  muscle?: string;
  limit?: number;
  page?: number;
};

export type ExerciseSearchResult = {
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

export type ExerciseSearchCapabilities = {
  canSearchExercises: boolean;
  supportsGymScopedExercises: boolean;
};

export const exerciseSearchCapabilities: ExerciseSearchCapabilities = {
  canSearchExercises: true,
  supportsGymScopedExercises: false,
};

export type ExerciseEndpointInventory = {
  endpoint: string;
  method: "GET" | "POST";
  exists: boolean;
  notes: string;
};

export const exerciseEndpointInventory: ExerciseEndpointInventory[] = [
  {
    endpoint: "/api/exercises",
    method: "GET",
    exists: true,
    notes: "Used for exercise list/search through BFF proxy to backend /exercises.",
  },
  {
    endpoint: "/api/exercises?gymId=:gymId",
    method: "GET",
    exists: false,
    notes: "Requiere implementación de contrato backend/BFF para scoping explícito por gimnasio.",
  },
];

function sanitizeOptions(values?: string[] | null) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function getItems(payload: ExerciseListPayload): Exercise[] {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export async function searchExercises(
  params: ExerciseSearchQuery,
  signal?: AbortSignal,
): Promise<ServiceResult<ExerciseSearchResult>> {
  const search = new URLSearchParams();
  const page = Number(params.page ?? 1);
  const limit = Number(params.limit ?? 24);

  if (params.query?.trim()) search.set("query", params.query.trim());
  if (params.equipment?.trim()) search.set("equipment", params.equipment.trim());
  if (params.muscle?.trim()) search.set("muscle", params.muscle.trim());
  search.set("offset", String((Math.max(page, 1) - 1) * limit));
  search.set("page", String(page));
  search.set("limit", String(limit));

  const result = await requestJson<ExerciseListPayload>(`/api/exercises?${search.toString()}`, { signal });
  if (!result.ok) return result;

  const payload = result.data;
  const items = getItems(payload);
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
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );
  const derivedPrimaryMuscle = sanitizeOptions(
    items
      .map((item) => item.mainMuscleGroup)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
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
    ok: true,
    data: {
      items,
      total,
      page: responsePage,
      limit: responseLimit,
      hasMore,
      filters: {
        equipment: filterEquipment.length > 0 ? filterEquipment : derivedEquipment,
        primaryMuscle: filterPrimaryMuscle.length > 0 ? filterPrimaryMuscle : derivedPrimaryMuscle,
      },
    },
  };
}
