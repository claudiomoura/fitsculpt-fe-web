import assert from "node:assert/strict";
import { buildContextualChatPrompt } from "../ai/chat/buildContextualChatPrompt.js";

function run() {
  const prompt = buildContextualChatPrompt(
    {
      message: "Que hago hoy?",
      surface: "feed",
      locale: "es",
      focusEntityId: "plan_1",
    },
    {
      user: { name: "Paula", plan: "PRO" },
      profile: { goal: "strength", activity: "moderate", level: "intermediate" },
      activeTrainingPlan: { title: "Fuerza base", goal: "strength", daysPerWeek: 3 },
      activeNutritionPlan: { title: "Corte", dailyCalories: 2100 },
    },
  );

  assert.match(prompt, /Surface context: feed\./);
  assert.match(prompt, /Focus entity id: plan_1\./);
  assert.match(prompt, /User basics: name=Paula; plan=PRO; goal=strength; activity=moderate; level=intermediate\./);
  assert.match(prompt, /Active training plan: title=Fuerza base; goal=strength; daysPerWeek=3\./);
  assert.match(prompt, /Active nutrition plan: title=Corte; dailyCalories=2100\./);

  const fallbackPrompt = buildContextualChatPrompt(
    { message: "Necesito consejo" },
    {
      user: { name: null, plan: null },
      profile: {},
      activeTrainingPlan: null,
      activeNutritionPlan: null,
    },
  );

  assert.match(fallbackPrompt, /Respond using locale='es'\./);
  assert.match(fallbackPrompt, /Surface context: general\./);
  assert.match(fallbackPrompt, /Focus entity id: none\./);
  assert.match(fallbackPrompt, /User basics: name=member; plan=FREE; goal=unknown; activity=unknown; level=unknown\./);
  assert.match(fallbackPrompt, /Active training plan: none\./);
  assert.match(fallbackPrompt, /Active nutrition plan: none\./);

  console.log("ai contextual chat prompt contracts passed");
}

run();
