type UnknownRecord = Record<string, unknown>;

export type RoleFlags = {
  isAdmin: boolean;
  isTrainer: boolean;
  isDev: boolean;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function hasValue(values: string[], target: string) {
  return values.some((item) => item.toUpperCase() === target);
}

function collectProfileCandidates(profile: unknown): UnknownRecord[] {
  if (!isRecord(profile)) return [];

  const candidates: UnknownRecord[] = [profile];
  const nestedKeys: Array<keyof UnknownRecord> = ["user", "data", "profile"];

  for (const key of nestedKeys) {
    const value = profile[key];
    if (isRecord(value)) {
      candidates.push(value);
    }
  }

  return candidates;
}

function collectRoleTokens(profile: unknown): string[] {
  const roleTokens: string[] = [];

  for (const candidate of collectProfileCandidates(profile)) {
    if (typeof candidate.role === "string") {
      roleTokens.push(candidate.role);
    }

    roleTokens.push(...getStringArray(candidate.roles));
  }

  return roleTokens.map((token) => token.toUpperCase());
}

function collectPermissionTokens(profile: unknown): string[] {
  const permissions: string[] = [];

  for (const candidate of collectProfileCandidates(profile)) {
    permissions.push(...getStringArray(candidate.permissions));
  }

  return permissions.map((token) => token.toUpperCase());
}

export function getRoleFlags(profile: unknown): RoleFlags {
  const roleTokens = collectRoleTokens(profile);
  const permissionTokens = collectPermissionTokens(profile);
  const isTrainerFlag = isRecord(profile) && profile.isTrainer === true;
  const isDevFlag = isRecord(profile) && profile.isDev === true;

  const isAdmin = hasValue(roleTokens, "ADMIN") || permissionTokens.includes("ADMIN");
  const isTrainer =
    isTrainerFlag ||
    hasValue(roleTokens, "TRAINER") ||
    permissionTokens.includes("TRAINER") ||
    permissionTokens.includes("TRAINER_READ");
  const isDev =
    isDevFlag ||
    hasValue(roleTokens, "DEV") ||
    hasValue(roleTokens, "DEVELOPER") ||
    permissionTokens.includes("DEV") ||
    permissionTokens.includes("DEVELOPER");

  return {
    isAdmin,
    isTrainer,
    isDev,
  };
}

export function isTrainer(profile: unknown): boolean {
  return getRoleFlags(profile).isTrainer;
}

export function isAdmin(profile: unknown): boolean {
  return getRoleFlags(profile).isAdmin;
}
