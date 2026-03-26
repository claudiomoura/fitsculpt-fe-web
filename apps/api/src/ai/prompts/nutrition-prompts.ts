import { formatRecipeLibrary, type RecipePromptItem } from "./training-prompts.js";

/**
 * AI Nutrition Prompt Builder
 * 
 * Contains all prompt templates for nutrition plan generation.
 * Easy to edit and customize without touching core logic.
 */

// ============================================================================
// Schema Types
// ============================================================================

interface NutritionData {
  age: number;
  sex: "male" | "female";
  goal: "cut" | "maintain" | "bulk";
  mealsPerDay: number;
  calories: number;
  startDate?: string;
  daysCount?: number;
  dietaryRestrictions?: string;
  dietType?: string;
  allergies?: string[];
  preferredFoods?: string;
  dislikedFoods?: string;
  mealDistribution?: string | { preset: string; percentages?: number[] };
}

// ============================================================================
// System Prompt Templates
// ============================================================================

export const NUTRITION_SYSTEM_PROMPT = `Eres un nutritionistadeporte senior. Genera un plan semanal compacto en JSON válido.`;
export const NUTRITION_OUTPUT_FORMAT = `Devuelve únicamente un objeto JSON válido. Sin texto adicional, sin markdown, sin comentarios.`;
export const NUTRITION_SCHEMA = `El JSON debe respetar exactamente este esquema: {title,startDate,dailyCalories,proteinG,fatG,carbsG,days:[{date,dayLabel,meals:[{type,recipeId,title,description,macros:{calories,protein,carbs,fats},ingredients}]}],shoppingList}`;

// ============================================================================
// Meal Structure Templates
// ============================================================================

export const MEAL_STRUCTURES: Record<number, string> = {
  2: "2 meals: lunch + dinner (o breakfast + dinner).",
  3: "3 meals: breakfast + lunch + dinner.",
  4: "4 meals: breakfast + lunch + snack + dinner.",
  5: "5 meals: breakfast + snack + lunch + snack + dinner.",
  6: "6 meals: breakfast + snack + lunch + snack + dinner + snack.",
};

// ============================================================================
// Dietary Guidelines
// ============================================================================

export const MEDITERRANEAN_GUIDE = `Base mediterránea: verduras, frutas, legumbres, cereales integrales, aceite de oliva, pescado, carne magra y frutos secos.`;
export const PORTION_GUIDE = `Evita cantidades absurdas. Porciones realistas y fáciles de cocinar.`;
export const MACRO_DISTRIBUTION_GUIDE = `Distribuye proteína, carbohidratos y grasas a lo largo del día.`;

// ============================================================================
// Math Validation Rules
// ============================================================================

export const MATH_RULES_PER_MEAL = `REGLA MATEMÁTICA OBLIGATORIA POR COMIDA: macros.calories = round(4*protein + 4*carbs + 9*fats).`;
export const MATH_RULES_PER_DAY = `REGLA MATEMÁTICA OBLIGATORIA POR DÍA: la suma de meal.macros.calories de ese día debe ser igual (con desvío mínimo) a dailyCalories.`;
export const MATH_RULES_GLOBAL = (calories: number) => `REGLA MATEMÁTICA OBLIGATORIA GLOBAL: dailyCalories debe ser exactamente ${calories}.`;
export const MATH_RULES_CONSISTENCY = `REGLA DE CONSISTENCIA: no dejes comidas con calories incompatibles con sus macros; si ajustas macros, recalcula calories de esa comida.`;
export const MATH_RULES_CLOSE_DAY = `REGLA DE CIERRE DIARIO: valida proteína, carbohidratos y grasas por día y corrige expected vs actual antes de responder.`;

// ============================================================================
// Variety Rules
// ============================================================================

export const VARIETY_RULE_DAY = `REGLA DE VARIEDAD OBLIGATORIA: CADA DÍA debe tener DIFERENTES recetas. Usa una rotación de recetas del catálogo. El mismo recipeId NO puede aparecer en más de un día.`;
export const VARIETY_RULE_TYPE = `REGLA DE VARIACIÓN POR TIPO: breakfast debe variar cada día (diferentes recetas de desayuno). snack debe variar cada día. lunch y dinner deben variar cada día. No usar la misma receta para diferentes tipos de comida.`;

// ============================================================================
// Category Rules
// ============================================================================

export const CATEGORY_RULE = `REGLA CATEGORÍA OBLIGATORIA: Usa cada receta SOLO para su categoría которая указана. DESAYUNO solo para breakfast. SNACK solo para snack. ALMUERZO/CENA solo para lunch/dinner. NUNCA uses bacalao/pescado para desayuno o snack. NUNCA uses nórd/avena para almuerzo/cena principal.`;

// ============================================================================
// Prompt Builder Function
// ============================================================================

export function buildNutritionPrompt(
  data: NutritionData,
  recipes: RecipePromptItem[] = [],
  strict = false,
  retryFeedback?: string,
): string {
  const distribution = typeof data.mealDistribution === "string"
    ? data.mealDistribution
    : (data.mealDistribution?.preset ?? "balanced");

  const distributionPercentages = typeof data.mealDistribution === "object" && data.mealDistribution?.percentages?.length
    ? `(${data.mealDistribution.percentages.join("%, ")}%)`
    : "";

  const recipeLibrary = formatRecipeLibrary(recipes);
  const mealsPerDay = Math.min(data.mealsPerDay, 6);
  const daysCount = Math.min(data.daysCount ?? 7, 14);
  const mealStructure = MEAL_STRUCTURES[mealsPerDay] || MEAL_STRUCTURES[3];

  const promptParts = [
    NUTRITION_SYSTEM_PROMPT,
    NUTRITION_OUTPUT_FORMAT,
    NUTRITION_SCHEMA,
    `OBLIGATORIO: cada día debe tener EXACTAMENTE el número de meals solicitado (si >6 usa 6).`,
    `Estructura de meals: ${mealStructure}`,
    `Genera EXACTAMENTE ${daysCount} días con date (YYYY-MM-DD) desde ${data.startDate ?? "la fecha indicada"}.`,
    "Descripción opcional. Ingredients opcional; si hay receta base, omite ingredients o déjalo vacío.",
    recipeLibrary
      ? "OBLIGATORIO: cada meal debe incluir recipeId existente del catálogo y title debe coincidir con esa receta."
      : "REQUER IMPLEMENTAÇÃO: sin catálogo de foods, usa recipeId null y limita referencias a recipes existentes cuando aplique.",
    MEDITERRANEAN_GUIDE,
    PORTION_GUIDE,
    MACRO_DISTRIBUTION_GUIDE,
    strict ? "REINTENTO: si los meals por día no coinciden exactamente, la respuesta será rechazada." : "",
    recipeLibrary
      ? `OBLIGATORIO: usa solo recipes del catálogo con recipeId válido. No inventes recetas.\n${recipeLibrary}`
      : "CATÁLOGO NO DISPONIBLE: responde con comidas simples sin recipeId inventados.",
    CATEGORY_RULE,
    `Perfil: Edad ${data.age}, sexo ${data.sex}, objetivo ${data.goal}.`,
    `Calorías objetivo diarias: ${data.calories}. Comidas/día: ${data.mealsPerDay}.`,
    `Restricciones o preferencias: ${data.dietaryRestrictions ?? "ninguna"}.`,
    `Tipo de dieta: ${data.dietType ?? "equilibrada"}.`,
    `Alergias: ${data.allergies?.join(", ") ?? "ninguna"}.`,
    `Preferencias (favoritos): ${data.preferredFoods ?? "ninguna"}.`,
    `Alimentos a evitar: ${data.dislikedFoods ?? "ninguno"}.`,
    `Distribución de comidas: ${distribution} ${distributionPercentages}.`,
    "Cada día debe incluir dayLabel en español (Lunes, Martes, Miércoles, etc).",
    "Usa siempre type y macros en cada comida.",
    MATH_RULES_PER_MEAL,
    MATH_RULES_PER_DAY,
    MATH_RULES_GLOBAL(data.calories),
    MATH_RULES_CONSISTENCY,
    MATH_RULES_CLOSE_DAY,
    VARIETY_RULE_DAY,
    VARIETY_RULE_TYPE,
    strict ? "REINTENTO OBLIGATORIO: corrige explícitamente incoherencias por comida y por día." : "",
    strict && retryFeedback ? `ERRORES DETECTADOS EN INTENTO PREVIO: ${retryFeedback}` : "",
    "Antes de responder, revalida internamente todas las sumas y corrige cualquier desvío numérico.",
    "Los macros diarios (proteinG, fatG, carbsG) deben ser coherentes con dailyCalories.",
    "Incluye title, dailyCalories, proteinG, fatG y carbsG siempre.",
  ];

  return promptParts.filter(Boolean).join(" ");
}

// ============================================================================
// Tip Prompt Builder
// ============================================================================

export function buildTipPrompt(data: { goal?: string }): string {
  return [
    "Eres un coach motivacional.",
    `Objetivo: ${data.goal ?? "general"}.`,
    'Salida JSON: {"title":string,"message":string}. Máx 250 tokens.',
  ].join(" ");
}

// ============================================================================
// Example Outputs (for few-shot prompting)
// ============================================================================

export const NUTRITION_EXAMPLE = `Ejemplo EXACTO de JSON (solo ejemplo, respeta tipos y campos): {title:"Plan mediterráneo",startDate:"2024-01-01",dailyCalories:2200,proteinG:140,fatG:70,carbsG:250,days:[{date:"2024-01-01",dayLabel:"Lunes",meals:[{type:"breakfast",recipeId:"rec_001",title:"Avena con nórd",macros:{calories:450,protein:25,carbs:45,fats:18},ingredients:[{name:"Avena",grams:60},{name:"Yogur griego",grams:180}]},{type:"lunch",recipeId:"rec_002",title:"Pollo con arroz",macros:{calories:700,protein:45,carbs:70,fats:25}},{type:"dinner",recipeId:"rec_003",title:"Salmón con verduras",macros:{calories:800,protein:50,carbs:60,fats:28}}]}]}`;