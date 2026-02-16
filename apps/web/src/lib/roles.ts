type UnknownRecord = Record<string, unknown>;

export type RoleFlags = {
  isAdmin: boolean;
  isTrainer: boolean;
  isDev: boolean;
};

export type CanonicalRole = "admin" | "coach" | "developer" | "user";

const ADMIN_ROLE_TOKENS = ["ADMIN", "ROLE_ADMIN", "ADMINISTRATOR"];
const TRAINER_ROLE_TOKENS = ["TRAINER", "COACH", "ROLE_TRAINER", "ROLE_COACH"];
const DEV_ROLE_TOKENS = ["DEV", "DEVELOPER", "ROLE_DEV", "ROLE_DEVELOPER"];
const USER_ROLE_TOKENS = ["USER", "ROLE_USER"];

const ADMIN_PERMISSION_TOKENS = ["ADMIN", "ROLE_ADMIN"];
const TRAINER_PERMISSION_TOKENS = ["TRAINER", "ROLE_TRAINER", "TRAINER_READ"];
const DEV_PERMISSION_TOKENS = ["DEV", "DEVELOPER", "ROLE_DEV", "ROLE_DEVELOPER"];

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

function hasAnyValue(values: string[], targets: string[]) {
  return targets.some((target) => hasValue(values, target));
}

function normalizeRoleToken(token: string): CanonicalRole | null {
  if (hasValue(ADMIN_ROLE_TOKENS, token)) return "admin";
  if (hasValue(TRAINER_ROLE_TOKENS, token)) return "coach";
  if (hasValue(DEV_ROLE_TOKENS, token)) return "developer";
  if (hasValue(USER_ROLE_TOKENS, token)) return "user";

  return null;
}

function collectProfileCandidates(profile: unknown): UnknownRecord[] {
  if (!isRecord(profile)) return [];

  const candidates: UnknownRecord[] = [profile];
  const nestedKeys: Array<keyof UnknownRecord> = ["user", "data", "profile"];

  for (const key of nestedKeys) {
    const candidate = profile[key];
    if (isRecord(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function collectRoleTokens(profile: unknown): string[] {
  const roleTokens: string[] = [];
  const candidates = collectProfileCandidates(profile);

  for (const candidate of candidates) {
    if (typeof candidate.role === "string") {
      roleTokens.push(candidate.role);
    }
    roleTokens.push(...getStringArray(candidate.roles));
  }

  return roleTokens.map((token) => token.toUpperCase());
}

function collectPermissionTokens(profile: unknown): string[] {
  const permissionTokens: string[] = [];

  for (const candidate of collectProfileCandidates(profile)) {
    permissionTokens.push(...getStringArray(candidate.permissions));
  }

  return permissionTokens.map((token) => token.toUpperCase());
}

export function getRoleFlags(profile: unknown): RoleFlags {
  const roleTokens = collectRoleTokens(profile);
  const permissionTokens = collectPermissionTokens(profile);
  const isTrainerFlag = isRecord(profile) && profile.isTrainer === true;
  const isDevFlag = isRecord(profile) && profile.isDev === true;
  const normalizedRoles = roleTokens
    .map((token) => normalizeRoleToken(token))
    .filter((role): role is CanonicalRole => role !== null);

  const isAdmin =
    normalizedRoles.includes("admin") ||
    hasAnyValue(permissionTokens, ADMIN_PERMISSION_TOKENS);
  const isTrainer =
    isTrainerFlag ||
    normalizedRoles.includes("coach") ||
    hasAnyValue(permissionTokens, TRAINER_PERMISSION_TOKENS);
  const isDev =
    isDevFlag ||
    normalizedRoles.includes("developer") ||
    hasAnyValue(permissionTokens, DEV_PERMISSION_TOKENS);

  return {
    isAdmin,
    isTrainer,
    isDev,
  };
}

export function getPrimaryRole(profile: unknown): CanonicalRole {
  const roleTokens = collectRoleTokens(profile);
  const normalizedRoles = roleTokens
    .map((token) => normalizeRoleToken(token))
    .filter((role): role is CanonicalRole => role !== null);

  if (normalizedRoles.includes("admin")) return "admin";
  if (normalizedRoles.includes("coach")) return "coach";
  if (normalizedRoles.includes("developer")) return "developer";
  if (normalizedRoles.includes("user")) return "user";

  return "user";
}

export function isTrainer(profile: unknown): boolean {
  return getRoleFlags(profile).isTrainer;
}

export function isAdmin(profile: unknown): boolean {
  return getRoleFlags(profile).isAdmin;
}
