import type { Prisma } from "@prisma/client";
import type { AuthenticatedEntitlementsRequest } from "../../middleware/entitlements.js";
import type { ExerciseCatalogItem } from "../trainingPlanExerciseResolution.js";
import { resolveUserContext, type UserContext } from "./contextResolver.js";
import { selectCandidateExercises, type CandidateExercise } from "./candidateSelector.js";
import { buildDaySkeletons, type DaySkeleton } from "./daySkeletonBuilder.js";
import { selectExercisesWithAi, selectExercisesWithFallback, type ExerciseSelection, type AiSelectorResult } from "./aiSelector.js";
import { computePrescriptionFromContext, type ExercisePrescription } from "./prescriptionEngine.js";
import { validateAndRepairDay, type ValidatedDay, type ValidatedExerciseSlot } from "./validatorRepair.js";

export type TrainingPlanV2Response = {
  planId?: string;
  plan: {
    title?: string;
    notes?: string;
    startDate: string;
    days: Array<{
      date: string;
      label: string;
      focus: string;
      duration: number;
      exercises: Array<{
        exerciseId: string | null;
        name: string;
        sets: number;
        reps: string;
        tempo: string;
        rest: number;
        imageUrl: string | null;
      }>;
    }>;
  };
  mode: "AI" | "FALLBACK" | "CACHE";
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

type OpenAiCallFn = (
  prompt: string,
  attempt: number,
  parser: (content: string) => Record<string, unknown>,
  options?: Record<string, unknown>,
) => Promise<{
  payload: Record<string, unknown>;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  model: string | null;
  requestId: string | null;
}>;

type GeneratorDeps = {
  prisma: Prisma.TransactionClient;
  callOpenAi: OpenAiCallFn;
  catalog: ExerciseCatalogItem[];
  saveTrainingPlan: (prisma: Prisma.TransactionClient, userId: string, plan: unknown, startDate: Date, daysCount: number, data: unknown) => Promise<{ id: string }>;
  buildCacheKey: (prefix: string, data: unknown) => string;
  getCachedAiPayload: (key: string) => Promise<unknown>;
  saveCachedAiPayload: (key: string, type: string, payload: unknown) => Promise<void>;
  storeAiContent: (userId: string, type: string, mode: string, payload: unknown) => Promise<void>;
  logger: {
    info: (obj: Record<string, unknown>, msg: string) => void;
    warn: (obj: Record<string, unknown>, msg: string) => void;
  };
};

const ZERO_USAGE = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCachePayloadKey(context: UserContext): string {
  return JSON.stringify({
    goal: context.goal,
    level: context.level,
    daysPerWeek: context.daysPerWeek,
    focus: context.focus,
    equipment: context.equipment,
  });
}

export async function generateTrainingPlanV2(
  request: AuthenticatedEntitlementsRequest,
  payload: Record<string, unknown>,
  deps: GeneratorDeps,
): Promise<TrainingPlanV2Response> {
  const { prisma, callOpenAi, catalog } = deps;

  const userContext = await resolveUserContext(request, prisma, payload as any);

  // Check versioned cache
  const cacheKey = deps.buildCacheKey("training-v2", buildCachePayloadKey(userContext));
  try {
    const cached = await deps.getCachedAiPayload(cacheKey);
    if (cached && typeof cached === "object" && "plan" in cached) {
      deps.logger.info({ cacheKey }, "training-v2 cache hit");
      return {
        ...(cached as TrainingPlanV2Response),
        mode: "CACHE",
        usage: ZERO_USAGE,
      };
    }
  } catch {
    // Cache miss — continue with generation
  }

  // Step 1: Build day skeletons
  const skeletons = buildDaySkeletons({
    daysPerWeek: userContext.daysPerWeek,
    level: userContext.level,
    goal: userContext.goal as "cut" | "maintain" | "bulk",
    focus: userContext.focus as "full" | "upperLower" | "ppl",
    startDate: userContext.startDate,
  });

  // Step 2: Get candidate exercises
  const candidates = await selectCandidateExercises(prisma, userContext, 20);

  if (candidates.length === 0) {
    deps.logger.warn({ userId: userContext.userId }, "training-v2: no candidates found, using catalog");
    // Fallback to catalog items as candidates
    const catalogCandidates: CandidateExercise[] = catalog.map((e) => ({
      id: e.id,
      name: e.name,
      imageUrl: e.imageUrl,
      equipment: e.equipment,
      mainMuscleGroup: e.mainMuscleGroup,
    }));
    return generateFallbackPlan(userContext, skeletons, catalogCandidates, deps);
  }

  // Step 3: For each day, use AI to select exercises
  let totalUsage = { ...ZERO_USAGE };
  let usedAi = false;
  const validatedDays: ValidatedDay[] = [];

  for (const day of skeletons) {
    const aiResult = await selectExercisesWithAi(callOpenAi, day, candidates, userContext);

    if (aiResult.usage) {
      totalUsage.promptTokens += aiResult.usage.promptTokens;
      totalUsage.completionTokens += aiResult.usage.completionTokens;
      totalUsage.totalTokens += aiResult.usage.totalTokens;
    }

    let selections = aiResult.selections;
    if (selections.length > 0) {
      usedAi = true;
    }

    // If AI failed entirely, use local fallback
    if (selections.length === 0) {
      selections = selectExercisesWithFallback(day, candidates);
    }

    // Step 4: Compute prescriptions for each slot
    const prescriptions: ExercisePrescription[] = selections.map(() =>
      computePrescriptionFromContext(userContext, day.focus),
    );

    // Step 5: Validate and repair
    const validated = validateAndRepairDay(
      day,
      selections,
      prescriptions,
      candidates,
      userContext.level,
    );

    validatedDays.push(validated);
  }

  // Build final plan
  const plan = {
    title: `Plan de entrenamiento v2 — ${userContext.goal}`,
    notes: "Generado con pipeline v2 (IA + prescripción local).",
    startDate: toIsoDateString(userContext.startDate),
    days: validatedDays.map((day) => ({
      date: day.date,
      label: day.label,
      focus: day.focus,
      duration: day.duration,
      exercises: day.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        tempo: ex.tempo,
        rest: ex.rest,
        imageUrl: ex.imageUrl,
      })),
    })),
  };

  // Save plan to DB
  let planId: string | undefined;
  try {
    const saved = await deps.saveTrainingPlan(
      prisma,
      userContext.userId,
      plan,
      userContext.startDate,
      userContext.daysCount,
      payload,
    );
    planId = saved.id;
  } catch (error) {
    deps.logger.warn({ err: error, userId: userContext.userId }, "training-v2: failed to save plan");
  }

  // Cache the result
  try {
    await deps.saveCachedAiPayload(cacheKey, "training-v2", { plan, planId, mode: usedAi ? "AI" : "FALLBACK" });
  } catch (error) {
    deps.logger.warn({ err: error, cacheKey }, "training-v2: cache save failed");
  }

  // Store AI content for analytics
  try {
    await deps.storeAiContent(userContext.userId, "training-v2", usedAi ? "ai" : "fallback", plan);
  } catch {
    // Non-critical
  }

  return {
    planId,
    plan,
    mode: usedAi ? "AI" : "FALLBACK",
    usage: totalUsage,
  };
}

function generateFallbackPlan(
  context: UserContext,
  skeletons: DaySkeleton[],
  candidates: CandidateExercise[],
  deps: GeneratorDeps,
): TrainingPlanV2Response {
  const validatedDays: ValidatedDay[] = [];

  for (const day of skeletons) {
    const selections = selectExercisesWithFallback(day, candidates);
    const prescriptions = selections.map(() =>
      computePrescriptionFromContext(context, day.focus),
    );
    const validated = validateAndRepairDay(
      day,
      selections,
      prescriptions,
      candidates,
      context.level,
    );
    validatedDays.push(validated);
  }

  const plan = {
    title: `Plan de entrenamiento v2 (fallback) — ${context.goal}`,
    notes: "Generado sin IA (fallback local).",
    startDate: toIsoDateString(context.startDate),
    days: validatedDays.map((day) => ({
      date: day.date,
      label: day.label,
      focus: day.focus,
      duration: day.duration,
      exercises: day.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        tempo: ex.tempo,
        rest: ex.rest,
        imageUrl: ex.imageUrl,
      })),
    })),
  };

  return {
    plan,
    mode: "FALLBACK",
    usage: ZERO_USAGE,
  };
}
