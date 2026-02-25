import { z } from "zod";

export const adminAssignGymRoleParamsSchema = z.object({
  userId: z.string().min(1),
  gymId: z.string().min(1),
});

export const adminAssignGymRoleBodySchema = z.object({
  role: z.enum(["MEMBER", "CLIENT", "TRAINER"]),
});

export const adminAssignGymRoleByUserParamsSchema = z.object({
  userId: z.string().min(1),
});

export const adminAssignGymRoleByUserBodySchema = z.object({
  gymId: z.string().min(1),
  role: z.enum(["MEMBER", "CLIENT", "TRAINER"]),
});

export function normalizeGymRole(role: z.infer<typeof adminAssignGymRoleBodySchema>["role"]) {
  if (role === "CLIENT") {
    return "MEMBER" as const;
  }
  return role;
}
