import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import { getDefaultAppPathForSessionRole, readSessionRole, type SessionRole } from "@/lib/auth/sessionRole";

type AuthMeRolePayload = {
  role?: unknown;
  isTrainer?: unknown;
};

function resolveRoleFromAuthMe(payload: AuthMeRolePayload): SessionRole | null {
  if (payload.role === "ADMIN") return "ADMIN";
  if (payload.isTrainer === true) return "TRAINER";
  if (payload.role === "USER") return "USER";
  return null;
}

export async function resolveServerSessionRole(): Promise<SessionRole> {
  const token = (await cookies()).get("fs_token")?.value;
  if (!token) return "UNKNOWN";

  const tokenRole = readSessionRole(token);
  if (tokenRole === "ADMIN" || tokenRole === "TRAINER") {
    return tokenRole;
  }

  try {
    const response = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { cookie: `fs_token=${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return tokenRole;
    }

    const payload = (await response.json()) as AuthMeRolePayload;
    return resolveRoleFromAuthMe(payload) ?? tokenRole;
  } catch {
    return tokenRole;
  }
}

export async function resolveDefaultAppPath(): Promise<"/app" | "/app/admin" | "/app/hoy" | "/app/trainer"> {
  const sessionRole = await resolveServerSessionRole();
  return getDefaultAppPathForSessionRole(sessionRole);
}
