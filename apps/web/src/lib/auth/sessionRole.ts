import { getPrimaryRole, getRoleFlags } from "@/lib/roles";

export type SessionRole = "ADMIN" | "TRAINER" | "USER" | "UNKNOWN";

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

  const roleFlags = getRoleFlags(claims);
  if (roleFlags.isAdmin) return "ADMIN";
  if (roleFlags.isTrainer) return "TRAINER";

  return getPrimaryRole(claims) === "user" ? "USER" : "UNKNOWN";
}

export function getDefaultAppPathForSessionRole(sessionRole: SessionRole): "/app" | "/app/admin" | "/app/hoy" | "/app/trainer" {
  if (sessionRole === "ADMIN") return "/app/admin";
  if (sessionRole === "TRAINER") return "/app/trainer";
  if (sessionRole === "USER") return "/app/hoy";

  return "/app";
}
