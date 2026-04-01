import { z } from "zod";

/**
 * AI Training Prompt Builder
 * 
 * Contains all prompt templates for training plan generation.
 * Easy to edit and customize without touching core logic.
 */

// ============================================================================
// Schema Types (for reference - actual schema is in index.ts or ai-schemas)
// ============================================================================

interface TrainingData {
  age: number;
  sex: "male" | "female";
  level: "beginner" | "intermediate" | "advanced";
  goal: "cut" | "maintain" | "bulk";
  goals?: string[];
  daysPerWeek: number;
  startDate?: string;
  daysCount?: number;
  focus: "full" | "upperLower" | "ppl";
  equipment: "gym" | "home";
  timeAvailableMinutes: number;
  includeCardio?: boolean;
  includeMobilityWarmups?: boolean;
  workoutLength?: string;
  timerSound?: string;
  injuries?: string;
  restrictions?: string;
}

// ============================================================================
// System Prompt Templates
// ============================================================================

/**
 * Base system prompt for training generation
 */
export const TRAINING_SYSTEM_PROMPT = `Eres entrenador personal senior. Responde SOLO JSON valido, sin markdown.`;

/**
 * Output format description
 */
export const TRAINING_OUTPUT_FORMAT = `Formato exacto: {title,startDate,notes,days:[{date,label,focus,duration,exercises:[{exerciseId,name,sets,reps,tempo,rest,notes}]}]}.`;

/**
 * Days constraint
 */
export const TRAINING_DAYS_CONSTRAINT = `days.length debe ser EXACTAMENTE diasPerWeek (max 7). Cada dia: 3-5 ejercicios.`;

/**
 * Exercise ID constraint
 */
export const TRAINING_EXERCISE_CONSTRAINT = `No inventes exerciseId ni entidades; todos los exerciseId deben existir en catalogo.`;

/**
 * Retry instruction for strict mode
 */
export const TRAINING_RETRY_INSTRUCTION = (strict: boolean) => 
  strict ? `REINTENTO: corrige dias exactos y volumen por nivel o se rechaza.` : ``;

/**
 * Level guidelines
 */
export const TRAINING_LEVEL_GUIDELINES = `Nivel: beginner (3-4 ejercicios, 30-50 min), intermedio/avanzado (4-5 ejercicios, 40-60 min).`;

/**
 * Volume guidelines
 */
export const TRAINING_VOLUME_GUIDELINES = `Evita volumen excesivo y descansos incoherentes.`;

/**
 * Structure guidelines
 */
export const TRAINING_STRUCTURE_GUIDE = `Estructura por enfoque: full=full body; upperLower=alterna upper/lower; ppl=push-pull-legs.`;

/**
 * Label guidelines
 */
export const TRAINING_LABEL_GUIDE = `Labels en espanol consistentes (ej: "Dia 1", "Dia 2").`;

// ============================================================================
// Prompt Builder Function
// ============================================================================

/**
 * Build complete training prompt from user data
 */
export function buildTrainingPrompt(
  data: TrainingData,
  strict = false,
  exerciseCatalogPrompt = "",
): string {
  const secondaryGoals = data.goals?.length
    ? data.goals.join(", ")
    : "no especificados";

  const cardio = typeof data.includeCardio === "boolean"
    ? data.includeCardio ? "sí" : "no"
    : "no especificado";

  const mobility = typeof data.includeMobilityWarmups === "boolean"
    ? data.includeMobilityWarmups ? "sí" : "no"
    : "no especificado";

  const workoutLength = data.workoutLength ?? "flexible";
  const timerSound = data.timerSound ?? "no especificado";
  const injuries = data.injuries?.trim() || "ninguna";
  const daysCount = Math.min(data.daysCount ?? data.daysPerWeek, 14);

  const catalogInstruction = exerciseCatalogPrompt
    ? `Usa SOLO exerciseId existentes en catalogo (id:nombre): ${exerciseCatalogPrompt}`
    : "";

  const EQUIPMENT_PROHIBITION_RULES: Record<string, string> = {
    "home": `
PROHIBICIÓN ABSOLUTA - EQUIPO:
Para usuarios que entrenan EN CASA (equipment=home) está PROHIBIDO sugerir:
- Cualquier ejercicio en banco de pesas (bench press, incline press, decline press)
- Máquina Smith
- Poleas o máquinas de cable (excepto si tiene banda elástica en casa)
- Prensa de piernas (leg press)
- Butterfly / apertura de pecho en máquina
- Remo sentado en máquina
- Guía o Smith machine para sentadilla
SOLO permitir: peso corporal (flexiones, dominadas, sentadillas, zancadas, planchas, fondos), 
mancuernas (si tiene), bandas elásticas, kettlebell (si tiene), botella de agua como peso.
    `.trim(),
    "gym": `
RECOMENDACIÓN - EQUIPO:
El usuario tiene acceso a gimnasio. Prioriza ejercicios con equipamiento de gimnasio.
    `.trim(),
  };

  const equipmentRule = EQUIPMENT_PROHIBITION_RULES[data.equipment] ?? EQUIPMENT_PROHIBITION_RULES["gym"];

  const INJURY_RULES = `
LESIONES Y LIMITACIONES:
Si el usuario tiene lesiones descritas, EVITA ejercicios que las empeoren:
- Lesión de hombro/hombros: evitar press militar, press inclinado, elevaciones laterales
- Lesión de rodilla/rodillas: evitar sentadilla profunda, zancadas profundas, leg press
- Lesión de espalda/columna: evitar deadlift convencional, peso muerto rumano, hiperextensiones
- Lesión de muñeca/muñecas: evitar flexiones, планка en forearms si duele
- Lesión de cuello/cervical: evitar shruggs, press militar
ADAPTA los ejercicios: si una lesión impide un movimiento, usa una variante o sustitución.
  `.trim();

  return [
    TRAINING_SYSTEM_PROMPT,
    TRAINING_OUTPUT_FORMAT,
    TRAINING_DAYS_CONSTRAINT,
    TRAINING_EXERCISE_CONSTRAINT,
    catalogInstruction,
    TRAINING_RETRY_INSTRUCTION(strict),
    TRAINING_LEVEL_GUIDELINES,
    TRAINING_VOLUME_GUIDELINES,
    `Perfil: edad ${data.age}, sexo ${data.sex}, nivel ${data.level}, objetivo ${data.goal}.`,
    `Secundarios: ${secondaryGoals}. Cardio: ${cardio}. Movilidad: ${mobility}.`,
    `Sesion preferida: ${workoutLength}. Timer: ${timerSound}.`,
    `Dias/semana ${data.daysPerWeek}, enfoque ${data.focus}, equipo ${data.equipment}.`,
    equipmentRule,
    INJURY_RULES,
    `Tiempo disponible por sesion ${data.timeAvailableMinutes} min. Restricciones/lesiones: ${data.restrictions ?? injuries}.`,
    TRAINING_STRUCTURE_GUIDE,
    `Asigna date (YYYY-MM-DD) desde ${data.startDate ?? "fecha indicada"} y distribuye sesiones en ${daysCount} dias.`,
    TRAINING_LABEL_GUIDE,
    "En cada ejercicio incluye exerciseId, name, sets y reps; tempo/rest/notes breves solo si aportan.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ============================================================================
// Recipe Catalog Formatting
// ============================================================================

export type RecipePromptItem = {
  id: string;
  name: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{ name: string; grams: number }>;
  steps: string[];
};

/**
 * Format recipe library for AI context
 * Categorizes recipes by meal type
 */
export function formatRecipeLibrary(recipes: RecipePromptItem[]): string {
  if (!recipes.length) return "";

  const categories = {
    breakfast: [] as string[],
    snack: [] as string[],
    lunch_dinner: [] as string[],
    fish: [] as string[],
  };

  const breakfastKeywords = [
    "yogur", "skyr", "avena", "overnight", "tostadas", "tortitas", "omelette",
    "tortilla de claras", "porridge", "pudín", "pan de plátano", "crepes", "arroz con leche"
  ];

  const snackKeywords = [
    "barritas", "edamame", "hummus", "guacamole", "batido", "smoothie", "yogur helado"
  ];

  const fishKeywords = [
    "salmón", "merluza", "atún", "bacalao", "lubina", "pescado", "ceviche",
    "pulpo", "calamares", "pez espada"
  ];

  for (const recipe of recipes) {
    const lower = recipe.name.toLowerCase();
    const line = `- [${recipe.id}] ${recipe.name} (${Math.round(recipe.calories)} kcal, P${Math.round(recipe.protein)} C${Math.round(recipe.carbs)} G${Math.round(recipe.fat)})`;

    if (breakfastKeywords.some(k => lower.includes(k))) {
      categories.breakfast.push(line);
    } else if (snackKeywords.some(k => lower.includes(k))) {
      categories.snack.push(line);
    } else if (fishKeywords.some(k => lower.includes(k))) {
      categories.fish.push(line);
    } else {
      categories.lunch_dinner.push(line);
    }
  }

  const sections = [];
  if (categories.breakfast.length > 0) {
    sections.push(`DESAYUNO (type="breakfast"): ${categories.breakfast.join(" ")}`);
  }
  if (categories.snack.length > 0) {
    sections.push(`SNACK (type="snack"): ${categories.snack.join(" ")}`);
  }
  if (categories.lunch_dinner.length > 0) {
    sections.push(`ALMUERZO/CENA (type="lunch" o "dinner"): ${categories.lunch_dinner.join(" ")}`);
  }

  return sections.join("\n");
}