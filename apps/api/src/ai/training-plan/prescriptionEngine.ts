import type { UserContext } from "./contextResolver.js";

type TrainingLevel = "beginner" | "intermediate" | "advanced";
type TrainingGoal = "cut" | "maintain" | "bulk";

export type ExercisePrescription = {
  sets: number;
  reps: string;
  tempo: string;
  rest: number;
};

type PrescriptionInput = {
  level: TrainingLevel;
  goal: TrainingGoal;
  focus: string;
};

function resolveSets(level: TrainingLevel, goal: TrainingGoal): number {
  if (level === "advanced") {
    return goal === "bulk" ? 5 : 4;
  }
  if (level === "intermediate") {
    return goal === "bulk" ? 4 : 3;
  }
  return 3;
}

function resolveReps(goal: TrainingGoal, focus: string): string {
  const normalizedFocus = focus.toLowerCase();

  if (normalizedFocus.includes("core") || normalizedFocus.includes("abdominal")) {
    return goal === "bulk" ? "12-15" : "15-20";
  }

  if (goal === "bulk") return "6-10";
  if (goal === "cut") return "10-15";
  return "8-12";
}

function resolveTempo(level: TrainingLevel): string {
  if (level === "advanced") return "3-1-2";
  if (level === "intermediate") return "2-1-2";
  return "2-0-2";
}

function resolveRest(level: TrainingLevel, goal: TrainingGoal): number {
  if (goal === "bulk") {
    return level === "advanced" ? 150 : 120;
  }
  if (goal === "cut") {
    return level === "advanced" ? 75 : 60;
  }
  return level === "advanced" ? 105 : 90;
}

export function computePrescription(input: PrescriptionInput): ExercisePrescription {
  return {
    sets: resolveSets(input.level, input.goal),
    reps: resolveReps(input.goal, input.focus),
    tempo: resolveTempo(input.level),
    rest: resolveRest(input.level, input.goal),
  };
}

export function computePrescriptionFromContext(
  context: UserContext,
  focus: string,
): ExercisePrescription {
  return computePrescription({
    level: context.level,
    goal: context.goal as TrainingGoal,
    focus,
  });
}
