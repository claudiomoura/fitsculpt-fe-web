export type TrainingExperienceLevel = "beginner" | "intermediate" | "advanced";

export function mapExperienceLevelToTrainingPlanLevel(
  experienceLevel: TrainingExperienceLevel,
): TrainingExperienceLevel {
  if (experienceLevel === "beginner") return "beginner";
  if (experienceLevel === "intermediate") return "intermediate";
  return "advanced";
}

