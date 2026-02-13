type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function hasArrayField(source: unknown, key: string): boolean {
  if (!isRecord(source)) return false;
  return Array.isArray(source[key]);
}

function hasObjectField(source: unknown, key: string): boolean {
  if (!isRecord(source)) return false;
  return isRecord(source[key]);
}

export function hasTrainerClientsCapability(source: unknown): boolean {
  if (!isRecord(source)) return false;

  if (hasArrayField(source, "users") || hasArrayField(source, "clients")) {
    return true;
  }

  if (hasObjectField(source, "data")) {
    const data = source.data;
    return hasArrayField(data, "users") || hasArrayField(data, "clients");
  }

  return false;
}

export function hasTrainerClientContextCapability(source: unknown): boolean {
  if (!isRecord(source)) return false;

  return (
    "lastLoginAt" in source ||
    "subscriptionStatus" in source ||
    hasObjectField(source, "tracking") ||
    hasObjectField(source, "plans")
  );
}

export function hasGymTenancyCapability(source: unknown): boolean {
  if (!isRecord(source)) return false;

  return (
    "gymId" in source ||
    "gymName" in source ||
    "tenantId" in source ||
    "tenant" in source ||
    "scope" in source
  );
}

export function hasGlobalExerciseScopeCapability(source: unknown): boolean {
  if (!isRecord(source)) return false;

  return "isGlobal" in source || "source" in source || "visibility" in source;
}
