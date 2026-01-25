export type Exercise = {
  id: string;
  slug?: string | null;
  name: string;
  equipment?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  mediaUrl?: string | null;
  videoUrl?: string | null;
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

export type RecipeIngredient = {
  id: string;
  recipeId?: string;
  name: string;
  grams: number;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl?: string | null;
  steps: string[];
  ingredients: RecipeIngredient[];
};

export type TrainingPlanListItem = {
  id: string;
  title: string;
  notes?: string | null;
  goal: string;
  level: string;
  daysPerWeek: number;
  focus: string;
  equipment: string;
  startDate: string;
  daysCount: number;
  createdAt: string;
};

export type TrainingPlanExercise = {
  id: string;
  name: string;
  sets: number;
  reps?: string | null;
  tempo?: string | null;
  rest?: number | null;
  notes?: string | null;
};

export type TrainingPlanDay = {
  id: string;
  date: string;
  label: string;
  focus: string;
  duration: number;
  exercises: TrainingPlanExercise[];
};

export type TrainingPlanDetail = {
  id: string;
  title: string;
  notes?: string | null;
  goal: string;
  level: string;
  daysPerWeek: number;
  focus: string;
  equipment: string;
  startDate: string;
  daysCount: number;
  days: TrainingPlanDay[];
};
