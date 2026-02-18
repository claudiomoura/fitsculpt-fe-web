import type { TrainingPlanDetail, TrainingPlanListItem } from "@/lib/types";

export type TrainerPlanListResponse = {
  items: TrainingPlanListItem[];
};

export type TrainerPlanDayOption = {
  id: string;
  label: string;
  exercisesCount: number;
};

export type TrainerPlanCreateInput = {
  title: string;
  description?: string;
};

export type AddExerciseToDayInput = {
  exerciseId: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function asList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const source = asRecord(payload);
  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.data)) return source.data;
  return [];
}

function parsePlanListItem(payload: unknown): TrainingPlanListItem | null {
  const source = asRecord(payload);
  const id = typeof source.id === "string" ? source.id : null;
  const title = typeof source.title === "string" ? source.title : null;
  if (!id || !title) return null;

  return {
    id,
    title,
    notes: typeof source.notes === "string" ? source.notes : null,
    goal: typeof source.goal === "string" ? source.goal : "",
    level: typeof source.level === "string" ? source.level : "",
    daysPerWeek: typeof source.daysPerWeek === "number" ? source.daysPerWeek : 0,
    focus: typeof source.focus === "string" ? source.focus : "",
    equipment: typeof source.equipment === "string" ? source.equipment : "",
    startDate: typeof source.startDate === "string" ? source.startDate : "",
    daysCount: typeof source.daysCount === "number" ? source.daysCount : 0,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : "",
  };
}

function parsePlanDetail(payload: unknown): TrainingPlanDetail | null {
  const source = asRecord(payload);
  const id = typeof source.id === "string" ? source.id : null;
  const title = typeof source.title === "string" ? source.title : null;
  if (!id || !title) return null;

  const daysSource = Array.isArray(source.days) ? source.days : [];

  return {
    id,
    title,
    notes: typeof source.notes === "string" ? source.notes : null,
    goal: typeof source.goal === "string" ? source.goal : "",
    level: typeof source.level === "string" ? source.level : "",
    daysPerWeek: typeof source.daysPerWeek === "number" ? source.daysPerWeek : daysSource.length,
    focus: typeof source.focus === "string" ? source.focus : "",
    equipment: typeof source.equipment === "string" ? source.equipment : "",
    startDate: typeof source.startDate === "string" ? source.startDate : "",
    daysCount: typeof source.daysCount === "number" ? source.daysCount : daysSource.length,
    days: daysSource
      .map((day) => {
        const dayRecord = asRecord(day);
        const dayId = typeof dayRecord.id === "string" ? dayRecord.id : null;
        if (!dayId) return null;
        const exercises = Array.isArray(dayRecord.exercises) ? dayRecord.exercises : [];

        return {
          id: dayId,
          date: typeof dayRecord.date === "string" ? dayRecord.date : "",
          label: typeof dayRecord.label === "string" ? dayRecord.label : dayId,
          focus: typeof dayRecord.focus === "string" ? dayRecord.focus : "",
          duration: typeof dayRecord.duration === "number" ? dayRecord.duration : 0,
          exercises: exercises
            .map((exercise) => {
              const exerciseRecord = asRecord(exercise);
              const exerciseId = typeof exerciseRecord.id === "string" ? exerciseRecord.id : null;
              const exerciseName = typeof exerciseRecord.name === "string" ? exerciseRecord.name : null;
              if (!exerciseId || !exerciseName) return null;
              return {
                id: exerciseId,
                name: exerciseName,
                sets: typeof exerciseRecord.sets === "number" ? exerciseRecord.sets : 0,
                reps: typeof exerciseRecord.reps === "string" ? exerciseRecord.reps : null,
                tempo: typeof exerciseRecord.tempo === "string" ? exerciseRecord.tempo : null,
                rest: typeof exerciseRecord.rest === "number" ? exerciseRecord.rest : null,
                notes: typeof exerciseRecord.notes === "string" ? exerciseRecord.notes : null,
              };
            })
            .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise)),
        };
      })
      .filter((day): day is NonNullable<typeof day> => Boolean(day)),
  };
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

export async function listTrainerPlans(): Promise<TrainerPlanListResponse> {
  const response = await fetch("/api/training-plans", { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error("TRAINER_PLAN_LIST_REQUEST_FAILED");

  const payload = await parseJson(response);
  const items = asList(payload)
    .map(parsePlanListItem)
    .filter((item): item is TrainingPlanListItem => Boolean(item));

  return { items };
}

export async function createTrainerPlan(input: TrainerPlanCreateInput): Promise<TrainingPlanListItem | null> {
  const response = await fetch("/api/training-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title: input.title.trim(), description: input.description?.trim() || undefined }),
  });

  if (!response.ok) {
    throw new Error("TRAINER_PLAN_CREATE_REQUEST_FAILED");
  }

  const payload = await parseJson(response);
  return parsePlanListItem(payload);
}

export async function getTrainerPlanDetail(planId: string): Promise<TrainingPlanDetail | null> {
  const response = await fetch(`/api/training-plans/${planId}`, { cache: "no-store", credentials: "include" });
  if (!response.ok) {
    throw new Error("TRAINER_PLAN_DETAIL_REQUEST_FAILED");
  }

  const payload = await parseJson(response);
  return parsePlanDetail(payload);
}

export async function addExerciseToTrainerPlanDay(
  planId: string,
  dayId: string,
  input: AddExerciseToDayInput,
): Promise<void> {
  const response = await fetch(`/api/training-plans/${planId}/days/${dayId}/exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ exerciseId: input.exerciseId }),
  });

  if (!response.ok) {
    throw new Error("TRAINER_PLAN_ADD_EXERCISE_REQUEST_FAILED");
  }
}

export function toTrainerPlanDayOptions(detail: TrainingPlanDetail | null): TrainerPlanDayOption[] {
  if (!detail) return [];
  return detail.days.map((day) => ({
    id: day.id,
    label: day.label || day.id,
    exercisesCount: Array.isArray(day.exercises) ? day.exercises.length : 0,
  }));
}
