import { getRoleFlags, type RoleFlags } from "@/lib/roles";

export type UserCapabilities = RoleFlags;
export type UserRoleFlags = RoleFlags;

export function getUserCapabilities(profile: unknown): UserCapabilities {
  return getRoleFlags(profile);
}

export function getUserRoleFlags(profile: unknown): UserRoleFlags {
  return getRoleFlags(profile);
}
