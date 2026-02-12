type UnknownRecord = Record<string, unknown>;

export type UserCapabilities = {
  isAdmin: boolean;
  isTrainer: boolean;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function hasRole(roles: string[], role: string) {
  return roles.some((item) => item.toUpperCase() === role);
}

function extractRoles(profile: unknown): string[] {
  if (!isRecord(profile)) return [];

  const role = profile.role;
  const roles = profile.roles;

  const collected: string[] = [];
  if (typeof role === "string") {
    collected.push(role);
  }

  if (Array.isArray(roles)) {
    for (const item of roles) {
      if (typeof item === "string") {
        collected.push(item);
      }
    }
  }

  return collected;
}

function extractPermissions(profile: unknown): string[] {
  if (!isRecord(profile)) return [];
  const permissions = profile.permissions;

  if (!Array.isArray(permissions)) return [];

  return permissions.filter((permission): permission is string => typeof permission === "string");
}

export function getUserCapabilities(profile: unknown): UserCapabilities {
  const roles = extractRoles(profile).map((role) => role.toUpperCase());
  const permissions = extractPermissions(profile).map((permission) => permission.toUpperCase());
  const isTrainerFlag = isRecord(profile) && profile.isTrainer === true;

  const isAdmin = hasRole(roles, "ADMIN") || permissions.includes("ADMIN");
  const isTrainer =
    isTrainerFlag ||
    hasRole(roles, "TRAINER") ||
    permissions.includes("TRAINER") ||
    permissions.includes("TRAINER_READ");

  return {
    isAdmin,
    isTrainer,
  };
}

