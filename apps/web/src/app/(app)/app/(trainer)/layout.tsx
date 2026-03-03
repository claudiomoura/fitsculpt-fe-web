import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionRole } from "@/lib/auth/sessionRole";

function readTokenRoleClaims(token: string): string[] {
  const payload = token.split(".")[1];
  if (!payload) return [];

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const parsed = JSON.parse(atob(padded)) as Record<string, unknown>;
    const directRoles = Array.isArray(parsed.roles) ? parsed.roles : [];
    const nestedUser = typeof parsed.user === "object" && parsed.user !== null ? (parsed.user as Record<string, unknown>) : null;
    const nestedRoles = nestedUser && Array.isArray(nestedUser.roles) ? nestedUser.roles : [];

    return [parsed.role, nestedUser?.role, ...directRoles, ...nestedRoles]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toUpperCase());
  } catch {
    return [];
  }
}

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("fs_token")?.value;
  const sessionRole = token ? readSessionRole(token) : "UNKNOWN";
  const roleClaims = token ? readTokenRoleClaims(token) : [];
  const isGymManager = roleClaims.includes("MANAGER") || roleClaims.includes("ROLE_MANAGER");

  if (sessionRole !== "TRAINER" && sessionRole !== "ADMIN" && !isGymManager) {
    redirect("/app");
  }

  return <div data-section-shell="trainer">{children}</div>;
}
