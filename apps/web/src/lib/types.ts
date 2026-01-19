export type Exercise = {
  id: string;
  slug?: string | null;
  name: string;
  equipment?: string | null;
  description?: string | null;
  mainMuscleGroup?: string | null;
  secondaryMuscleGroups?: string[] | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  technique?: string | null;
  tips?: string | null;
};

export type WorkoutExercise = {
  muscleGroup: string | null | undefined;
  id?: string | null;
  exerciseId?: string | null;
  name: string;
  sets?: string | number | null;
  reps?: string | number | null;
  loadKg?: number | string | null;
  rpe?: number | string | null;
  rir?: number | string | null;
  restSeconds?: number | string | null;
  notes?: string | null;
  primaryMuscle?: string | null;
  lastLog?: {
    loadKg?: number | string | null;
    reps?: number | string | null;
  } | null;
};

export type Workout = {
  id: string;
  name: string;
  notes?: string | null;
  scheduledAt?: string | null;
  durationMin?: number | null;
  goal?: string | null;
  dayLabel?: string | null;
  split?: string | null;
  experienceLevel?: string | null;
  targetMuscles?: string[] | null;
  focus?: string | null;
  totalSets?: number | null;
  estimatedDurationMin?: number | null;
  exercises?: WorkoutExercise[] | null;
};
