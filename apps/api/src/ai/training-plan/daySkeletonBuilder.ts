type TrainingLevel = "beginner" | "intermediate" | "advanced";
type TrainingGoal = "cut" | "maintain" | "bulk";
type TrainingFocus = "full" | "upperLower" | "ppl";

export type DaySkeleton = {
  label: string;
  focus: string;
  exerciseSlots: number;
  date: string;
};

type DaySkeletonInput = {
  daysPerWeek: number;
  level: TrainingLevel;
  goal: TrainingGoal;
  focus: TrainingFocus;
  startDate: Date;
};

const FOCUS_SPLIT_MAP: Record<TrainingFocus, string[]> = {
  full: [
    "Full body (empuje + tirón + pierna)",
    "Full body (pierna + empuje + core)",
    "Full body (tirón + pierna + empuje)",
    "Full body (pierna + tirón + core)",
    "Full body (empuje + pierna + tirón)",
    "Full body (tirón + empuje + pierna)",
    "Full body (pierna + empuje + tirón)",
  ],
  upperLower: [
    "Tren inferior (cuádriceps dominante)",
    "Tren superior (empuje)",
    "Tren inferior (posterior dominante)",
    "Tren superior (tirón)",
    "Tren inferior (mixto)",
    "Tren superior (mixto)",
    "Full body técnico",
  ],
  ppl: [
    "Empuje (Pecho/Hombro/Tríceps)",
    "Tirón (Espalda/Bíceps)",
    "Pierna + Core",
    "Empuje (Pecho/Hombro/Tríceps)",
    "Tirón (Espalda/Bíceps)",
    "Pierna posterior + Glúteo",
    "Full body técnico",
  ],
};

function resolveExerciseSlots(level: TrainingLevel): number {
  if (level === "advanced") return 5;
  if (level === "intermediate") return 4;
  return 3;
}

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(start: Date, days: number): Date {
  const next = new Date(start);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildDaySkeletons(input: DaySkeletonInput): DaySkeleton[] {
  const split = FOCUS_SPLIT_MAP[input.focus];
  const slots = resolveExerciseSlots(input.level);
  const days: DaySkeleton[] = [];

  for (let i = 0; i < input.daysPerWeek; i += 1) {
    const focusLabel = split[i % split.length]!;
    days.push({
      label: `Día ${i + 1}`,
      focus: focusLabel,
      exerciseSlots: slots,
      date: toIsoDateString(addDays(input.startDate, i)),
    });
  }

  return days;
}
