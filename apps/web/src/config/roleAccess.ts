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

  if (normalized === "admin") return "admin";
  if (normalized === "coach" || normalized === "trainer") return "coach";
  if (normalized === "dev" || normalized === "developer") return "developer";
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
