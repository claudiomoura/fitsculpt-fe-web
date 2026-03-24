import type { CandidateExercise } from "./candidateSelector.js";
import type { DaySkeleton } from "./daySkeletonBuilder.js";
import type { UserContext } from "./contextResolver.js";

export type ExerciseSelection = {
  exerciseId: string;
};

export type AiSelectorResult = {
  selections: ExerciseSelection[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  model: string | null;
  requestId: string | null;
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

type SlotInput = {
  day: DaySkeleton;
  slotIndex: number;
  candidates: CandidateExercise[];
  alreadySelected: Set<string>;
};

function buildSlotPrompt(
  slot: SlotInput,
  context: UserContext,
): string {
  const candidateList = slot.candidates
    .filter((c) => !slot.alreadySelected.has(c.id))
    .map((c) => `- ${c.id}: ${c.name} (${c.mainMuscleGroup ?? "sin grupo"})`)
    .join("\n");

  const alreadyNames = [...slot.alreadySelected]
    .map((id) => slot.candidates.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return `Eres un entrenador personal. Selecciona el MEJOR ejercicio para este slot.

Día: ${slot.day.label} — Enfoque: ${slot.day.focus}
Slot: ejercicio ${slot.slotIndex + 1} de ${slot.day.exerciseSlots}
Nivel: ${context.level}
Objetivo: ${context.goal}
${slot.alreadySelected.size > 0 ? `Ya seleccionados en este día: ${alreadyNames}` : ""}

Candidatos disponibles (elige UNO por su ID):
${candidateList || "- (ninguno disponible)"}

Responde SOLO con JSON válido:
{ "exerciseId": "<id_del_ejercicio>" }

El ejercicio elegido debe ser coherente con el enfoque del día y no repetir ejercicios ya seleccionados.`;
}

const EMPTY_SELECTION: ExerciseSelection[] = [];

export async function selectExercisesWithAi(
  callOpenAi: OpenAiCallFn,
  day: DaySkeleton,
  candidates: CandidateExercise[],
  context: UserContext,
): Promise<AiSelectorResult> {
  if (candidates.length === 0 || day.exerciseSlots <= 0) {
    return {
      selections: EMPTY_SELECTION,
      usage: null,
      model: null,
      requestId: null,
    };
  }

  const selections: ExerciseSelection[] = [];
  const alreadySelected = new Set<string>();
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let lastModel: string | null = null;
  let lastRequestId: string | null = null;

  for (let slotIndex = 0; slotIndex < day.exerciseSlots; slotIndex += 1) {
    const slot: SlotInput = {
      day,
      slotIndex,
      candidates,
      alreadySelected,
    };

    const prompt = buildSlotPrompt(slot, context);

    try {
      const result = await callOpenAi(prompt, 0, JSON.parse, {
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "exercise_selection",
            schema: {
              type: "object",
              properties: {
                exerciseId: { type: "string" },
              },
              required: ["exerciseId"],
              additionalProperties: false,
            },
            strict: true,
          },
        },
        model: "gpt-4o-mini",
        maxTokens: 100,
        retryOnParseError: false,
      });

      const exerciseId = typeof result.payload.exerciseId === "string"
        ? result.payload.exerciseId.trim()
        : null;

      if (exerciseId && candidates.some((c) => c.id === exerciseId)) {
        selections.push({ exerciseId });
        alreadySelected.add(exerciseId);
      }

      if (result.usage) {
        totalUsage.promptTokens += result.usage.prompt_tokens ?? 0;
        totalUsage.completionTokens += result.usage.completion_tokens ?? 0;
        totalUsage.totalTokens += result.usage.total_tokens ?? 0;
      }
      lastModel = result.model;
      lastRequestId = result.requestId;
    } catch {
      // If AI fails for this slot, skip — validator/repair will handle it
    }
  }

  return {
    selections,
    usage: totalUsage.totalTokens > 0 ? totalUsage : null,
    model: lastModel,
    requestId: lastRequestId,
  };
}

export function selectExercisesWithFallback(
  day: DaySkeleton,
  candidates: CandidateExercise[],
): ExerciseSelection[] {
  if (candidates.length === 0) return EMPTY_SELECTION;

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, day.exerciseSlots).map((c) => ({ exerciseId: c.id }));
}
