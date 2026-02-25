const ADMIN_ROLE_TOKENS = new Set(["ADMIN", "ROLE_ADMIN", "ADMINISTRATOR"]);
const TRAINER_ROLE_TOKENS = new Set(["TRAINER", "COACH", "ROLE_TRAINER", "ROLE_COACH"]);
const USER_ROLE_TOKENS = new Set(["USER", "ROLE_USER"]);

export type SessionRole = "ADMIN" | "TRAINER" | "USER" | "UNKNOWN";

function toUpperString(value: unknown) {
  return typeof value === "string" ? value.toUpperCase() : null;
}

function collectTokenClaims(claims: Record<string, unknown>) {
  const directRole = toUpperString(claims.role);
  const directRoles = Array.isArray(claims.roles)
    ? claims.roles.map((item) => toUpperString(item)).filter((item): item is string => item !== null)
    : [];

  const nestedUser = claims.user;
  const nestedRole =
    typeof nestedUser === "object" && nestedUser !== null ? toUpperString((nestedUser as Record<string, unknown>).role) : null;
  const nestedRoles =
    typeof nestedUser === "object" && nestedUser !== null && Array.isArray((nestedUser as Record<string, unknown>).roles)
      ? ((nestedUser as Record<string, unknown>).roles as unknown[])
          .map((item) => toUpperString(item))
          .filter((item): item is string => item !== null)
      : [];

  return [directRole, nestedRole, ...directRoles, ...nestedRoles].filter((item): item is string => item !== null);
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function readSessionRole(token: string): SessionRole {
  const claims = decodeTokenPayload(token);
  if (!claims) return "UNKNOWN";

  const roleTokens = collectTokenClaims(claims);

  if (roleTokens.some((roleToken) => ADMIN_ROLE_TOKENS.has(roleToken))) return "ADMIN";
  if (roleTokens.some((roleToken) => TRAINER_ROLE_TOKENS.has(roleToken))) return "TRAINER";
  if (roleTokens.some((roleToken) => USER_ROLE_TOKENS.has(roleToken))) return "USER";

  return "UNKNOWN";
}

