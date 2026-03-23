import type { ContextualChatRequest } from "./contextualChatSchemas.js";

type ContextualChatPromptContext = {
  user: {
    name?: string | null;
    plan?: string | null;
  };
  profile: {
    goal?: string;
    activity?: string;
    level?: string;
  };
  activeTrainingPlan: {
    title?: string | null;
    goal?: string | null;
    daysPerWeek?: number | null;
  } | null;
  activeNutritionPlan: {
    title?: string | null;
    dailyCalories?: number | null;
  } | null;
};

function sanitizeText(value: string | null | undefined, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function buildContextualChatPrompt(
  request: ContextualChatRequest,
  context: ContextualChatPromptContext,
) {
  const userName = sanitizeText(context.user.name, "member");
  const userPlan = sanitizeText(context.user.plan, "FREE");
  const goal = sanitizeText(context.profile.goal, "unknown");
  const activity = sanitizeText(context.profile.activity, "unknown");
  const level = sanitizeText(context.profile.level, "unknown");
  const locale = sanitizeText(request.locale, "es");
  const surface = request.surface ?? "general";
  const focusEntityId = sanitizeText(request.focusEntityId, "none");

  const trainingPlanSummary = context.activeTrainingPlan
    ? `title=${sanitizeText(context.activeTrainingPlan.title, "untitled")}; goal=${sanitizeText(context.activeTrainingPlan.goal, "unknown")}; daysPerWeek=${context.activeTrainingPlan.daysPerWeek ?? "unknown"}`
    : "none";

  const nutritionPlanSummary = context.activeNutritionPlan
    ? `title=${sanitizeText(context.activeNutritionPlan.title, "untitled")}; dailyCalories=${context.activeNutritionPlan.dailyCalories ?? "unknown"}`
    : "none";

  return [
    "You are FitSculpt's in-app assistant. Keep answers concise, practical, and fitness/nutrition focused.",
    `Respond using locale='${locale}'.`,
    "Return JSON only with shape: {\"reply\":{\"title\"?:string,\"message\":string,\"suggestions\"?:string[]}}.",
    "Never include medical diagnosis, prescription, or unsafe advice.",
    "If user asks outside training/nutrition/wellness context, politely redirect to app-related coaching.",
    `Surface context: ${surface}.`,
    `Focus entity id: ${focusEntityId}.`,
    `User basics: name=${userName}; plan=${userPlan}; goal=${goal}; activity=${activity}; level=${level}.`,
    `Active training plan: ${trainingPlanSummary}.`,
    `Active nutrition plan: ${nutritionPlanSummary}.`,
    `User message: ${request.message}`,
  ].join("\n");
}
