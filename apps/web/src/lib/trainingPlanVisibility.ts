type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getPlanGymId(rawPlan: UnknownRecord): string | null {
  const gym = asRecord(rawPlan.gym);
  const tenant = asRecord(rawPlan.tenant);

  return (
    asText(rawPlan.gymId) ??
    asText(rawPlan.tenantId) ??
    asText(rawPlan.organizationId) ??
    asText(gym?.id) ??
    asText(gym?.gymId) ??
    asText(tenant?.id) ??
    asText(tenant?.gymId) ??
    null
  );
}

function hasGymSignals(rawPlan: UnknownRecord): boolean {
  return (
    "gymId" in rawPlan ||
    "tenantId" in rawPlan ||
    "organizationId" in rawPlan ||
    "gym" in rawPlan ||
    "tenant" in rawPlan
  );
}

export function isTrainingPlanVisibleForGym(plan: unknown, gymId: string | null): boolean {
  const rawPlan = asRecord(plan);
  if (!rawPlan) return false;
  if (!hasGymSignals(rawPlan)) return true;
  if (!gymId) return false;
  return getPlanGymId(rawPlan) === gymId;
}

