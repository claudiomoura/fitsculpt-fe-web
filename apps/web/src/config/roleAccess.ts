export type RoleName = "admin" | "coach" | "user";

export type RoleAccessInput = {
  role?: string | null;
  isAdmin?: boolean;
  isCoach?: boolean;
};

function normalizeRole(role: string | null | undefined): RoleName | null {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toLowerCase();

  if (normalized === "admin") return "admin";
  if (normalized === "coach" || normalized === "trainer") return "coach";
  if (normalized === "user") return "user";

  return null;
}

export function canAccessAdmin(input: RoleAccessInput): boolean {
  if (input.isAdmin === true) return true;

  return normalizeRole(input.role) === "admin";
}

export function canAccessTrainer(input: RoleAccessInput): boolean {
  if (canAccessAdmin(input)) return true;
  if (input.isCoach === true) return true;

  return normalizeRole(input.role) === "coach";
}
