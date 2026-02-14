type UnknownRecord = Record<string, unknown>;

export type GymMembershipState = "in_gym" | "not_in_gym" | "unknown";

export type GymMembership = {
  state: GymMembershipState;
  gymId: string | null;
  gymName: string | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return getString(value);
}

function readTenantFields(source: unknown): { gymId: string | null; gymName: string | null; hasGymKeys: boolean } {
  if (!isRecord(source)) {
    return { gymId: null, gymName: null, hasGymKeys: false };
  }

  const tenant = source.tenant;
  const tenantRecord = isRecord(tenant) ? tenant : null;

  const gymId =
    getId(source.gymId) ??
    getId(source.tenantId) ??
    getId(tenantRecord?.gymId) ??
    getId(tenantRecord?.tenantId) ??
    getId(tenantRecord?.id);

  const gymName =
    getString(source.gymName) ??
    getString(tenantRecord?.gymName) ??
    getString(tenantRecord?.tenantName) ??
    getString(tenantRecord?.name) ??
    (!tenantRecord ? getString(tenant) : null);

  const hasGymKeys =
    "gymId" in source ||
    "gymName" in source ||
    "tenantId" in source ||
    "tenant" in source ||
    (tenantRecord ? "id" in tenantRecord || "gymId" in tenantRecord || "tenantId" in tenantRecord || "name" in tenantRecord : false);

  return { gymId, gymName, hasGymKeys };
}

export function extractGymMembership(source: unknown): GymMembership {
  const candidates = [source];

  if (isRecord(source)) {
    candidates.push(source.data, source.profile, source.user);
  }

  let sawGymKeys = false;

  for (const candidate of candidates) {
    const fields = readTenantFields(candidate);
    sawGymKeys = sawGymKeys || fields.hasGymKeys;

    if (fields.gymId || fields.gymName) {
      return {
        state: "in_gym",
        gymId: fields.gymId,
        gymName: fields.gymName,
      };
    }
  }

  return {
    state: sawGymKeys ? "not_in_gym" : "unknown",
    gymId: null,
    gymName: null,
  };
}

export function canAccessTrainerGymArea(input: { isAdmin: boolean; isCoach: boolean; membership: GymMembership }): boolean {
  const hasTrainerRole = input.isCoach || input.isAdmin;
  return hasTrainerRole && input.membership.state === "in_gym";
}
