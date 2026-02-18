type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

function getExerciseGymId(rawExercise: UnknownRecord): string | null {
  const gym = asRecord(rawExercise.gym);
  const tenant = asRecord(rawExercise.tenant);
  const owner = asRecord(rawExercise.owner);
  const createdBy = asRecord(rawExercise.createdBy);

  return (
    asText(rawExercise.gymId) ??
    asText(rawExercise.ownerGymId) ??
    asText(rawExercise.createdByGymId) ??
    asText(rawExercise.tenantId) ??
    asText(rawExercise.organizationId) ??
    asText(gym?.id) ??
    asText(gym?.gymId) ??
    asText(tenant?.id) ??
    asText(tenant?.gymId) ??
    asText(owner?.gymId) ??
    asText(createdBy?.gymId) ??
    null
  );
}

function isGlobalExercise(rawExercise: UnknownRecord): boolean {
  const visibility = asText(rawExercise.visibility)?.toLowerCase();
  const source = asText(rawExercise.source)?.toLowerCase();
  const scope = asText(rawExercise.scope)?.toLowerCase();
  const explicitGlobal = asBoolean(rawExercise.isGlobal);

  if (explicitGlobal === true) return true;
  if (visibility && ["global", "public", "shared"].includes(visibility)) return true;
  if (scope && ["global", "public"].includes(scope)) return true;
  if (source && ["global", "system", "default"].includes(source)) return true;

  return false;
}

function hasVisibilitySignals(rawExercise: UnknownRecord): boolean {
  return (
    "isGlobal" in rawExercise ||
    "visibility" in rawExercise ||
    "scope" in rawExercise ||
    "source" in rawExercise ||
    "gymId" in rawExercise ||
    "ownerGymId" in rawExercise ||
    "createdByGymId" in rawExercise ||
    "tenantId" in rawExercise ||
    "organizationId" in rawExercise ||
    "gym" in rawExercise ||
    "tenant" in rawExercise ||
    "owner" in rawExercise ||
    "createdBy" in rawExercise
  );
}

export function isExerciseVisibleForGym(exercise: unknown, gymId: string | null): boolean {
  const rawExercise = asRecord(exercise);
  if (!rawExercise) return false;

  if (!hasVisibilitySignals(rawExercise)) {
    // Keep backward compatibility with older payloads where backend already filters by tenancy.
    return true;
  }

  if (isGlobalExercise(rawExercise)) return true;

  const exerciseGymId = getExerciseGymId(rawExercise);
  if (!gymId) return false;

  return exerciseGymId === gymId;
}

