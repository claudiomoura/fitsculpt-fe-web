export type RoleName = "admin" | "coach" | "developer" | "user";

import type { GymMembershipState } from "@/lib/gymMembership";

export type RoleAccessInput = {
  role?: string | null;
  isAdmin?: boolean;
  isCoach?: boolean;
  isDev?: boolean;
  gymMembershipState?: GymMembershipState;
};

function normalizeRole(role: string | null | undefined): RoleName | null {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toLowerCase();

  if (["admin", "role_admin", "administrator"].includes(normalized)) return "admin";
  if (["coach", "trainer", "role_coach", "role_trainer"].includes(normalized)) return "coach";
  if (["dev", "developer", "role_dev", "role_developer"].includes(normalized)) return "developer";
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

  if (input.gymMembershipState && input.gymMembershipState !== "in_gym") return false;

  return normalizeRole(input.role) === "coach";
}

export function canAccessDevelopment(input: RoleAccessInput): boolean {
  if (canAccessAdmin(input)) return true;
  if (input.isDev === true) return true;

  return normalizeRole(input.role) === "developer";
}
