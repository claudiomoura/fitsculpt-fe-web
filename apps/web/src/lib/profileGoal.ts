import type { Goal } from "@/lib/profile";

export function normalizeGoalWeightForGoal(
  goal: Goal | "",
  currentWeightKg: number | null,
  goalWeightKg: number | null
): number | null {
  if (goal !== "maintain") {
    return goalWeightKg;
  }

  return currentWeightKg ?? null;
}
