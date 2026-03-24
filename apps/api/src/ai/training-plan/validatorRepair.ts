import type { CandidateExercise } from "./candidateSelector.js";
import type { ExercisePrescription } from "./prescriptionEngine.js";
import type { ExerciseSelection } from "./aiSelector.js";
import type { DaySkeleton } from "./daySkeletonBuilder.js";

export type ValidatedExerciseSlot = {
  exerciseId: string | null;
  name: string;
  sets: number;
  reps: string;
  tempo: string;
  rest: number;
  imageUrl: string | null;
  repaired: boolean;
};

type ValidateInput = {
  selection: ExerciseSelection;
  prescription: ExercisePrescription;
  candidates: CandidateExercise[];
  alreadyUsed: Set<string>;
};

function findCandidate(id: string, candidates: CandidateExercise[]): CandidateExercise | null {
  return candidates.find((c) => c.id === id) ?? null;
}

function findReplacement(
  candidates: CandidateExercise[],
  alreadyUsed: Set<string>,
): CandidateExercise | null {
  return candidates.find((c) => !alreadyUsed.has(c.id)) ?? null;
}

export function validateAndRepairSlot(input: ValidateInput): ValidatedExerciseSlot {
  const { selection, prescription, candidates, alreadyUsed } = input;

  let candidate = findCandidate(selection.exerciseId, candidates);
  let repaired = false;

  if (!candidate || alreadyUsed.has(candidate.id)) {
    candidate = findReplacement(candidates, alreadyUsed);
    repaired = true;
  }

  if (!candidate) {
    return {
      exerciseId: null,
      name: "Sin ejercicio (slot vacío)",
      sets: prescription.sets,
      reps: prescription.reps,
      tempo: prescription.tempo,
      rest: prescription.rest,
      imageUrl: null,
      repaired: true,
    };
  }

  alreadyUsed.add(candidate.id);

  return {
    exerciseId: candidate.id,
    name: candidate.name,
    sets: prescription.sets,
    reps: prescription.reps,
    tempo: prescription.tempo,
    rest: prescription.rest,
    imageUrl: candidate.imageUrl ?? null,
    repaired,
  };
}

export type ValidatedDay = {
  label: string;
  focus: string;
  duration: number;
  date: string;
  exercises: ValidatedExerciseSlot[];
};

function resolveDuration(level: string): number {
  if (level === "advanced") return 70;
  if (level === "intermediate") return 60;
  return 50;
}

export function validateAndRepairDay(
  day: DaySkeleton,
  selections: ExerciseSelection[],
  prescriptions: ExercisePrescription[],
  candidates: CandidateExercise[],
  level: string,
): ValidatedDay {
  const alreadyUsed = new Set<string>();
  const exercises: ValidatedExerciseSlot[] = [];

  for (let i = 0; i < selections.length; i += 1) {
    const prescription = prescriptions[i] ?? prescriptions[prescriptions.length - 1]!;
    const validated = validateAndRepairSlot({
      selection: selections[i]!,
      prescription,
      candidates,
      alreadyUsed,
    });
    exercises.push(validated);
  }

  return {
    label: day.label,
    focus: day.focus,
    duration: resolveDuration(level),
    date: day.date,
    exercises,
  };
}
