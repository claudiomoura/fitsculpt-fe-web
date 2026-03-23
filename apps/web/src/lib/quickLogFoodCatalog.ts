export type QuickLogFoodItem = {
  id: string;
  name: string;
  aliases: string[];
  barcode: string;
  per100: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
};

export const QUICK_LOG_FOOD_CATALOG: QuickLogFoodItem[] = [
  {
    id: "chicken-breast",
    name: "Pechuga de pollo",
    aliases: ["pollo", "pechuga", "chicken"],
    barcode: "840000000101",
    per100: { calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  },
  {
    id: "white-rice",
    name: "Arroz blanco cocido",
    aliases: ["arroz", "rice"],
    barcode: "840000000102",
    per100: { calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
  },
  {
    id: "oats",
    name: "Avena",
    aliases: ["avena", "oats"],
    barcode: "840000000103",
    per100: { calories: 389, protein: 17, carbs: 66, fats: 7 },
  },
  {
    id: "egg",
    name: "Huevo",
    aliases: ["huevo", "huevos", "egg", "eggs"],
    barcode: "840000000104",
    per100: { calories: 155, protein: 13, carbs: 1.1, fats: 11 },
  },
  {
    id: "salmon",
    name: "Salmon",
    aliases: ["salmon", "samon"],
    barcode: "840000000105",
    per100: { calories: 208, protein: 20, carbs: 0, fats: 13 },
  },
  {
    id: "greek-yogurt",
    name: "Yogur griego",
    aliases: ["yogur", "yogurt", "yogur griego", "greek yogurt"],
    barcode: "840000000106",
    per100: { calories: 97, protein: 9, carbs: 3.9, fats: 5 },
  },
  {
    id: "banana",
    name: "Banana",
    aliases: ["banana", "platano", "banano"],
    barcode: "840000000107",
    per100: { calories: 89, protein: 1.1, carbs: 22.8, fats: 0.3 },
  },
  {
    id: "protein-bar",
    name: "Barra de proteina",
    aliases: ["barra", "barra proteina", "protein bar"],
    barcode: "840000000108",
    per100: { calories: 360, protein: 30, carbs: 35, fats: 10 },
  },
  {
    id: "whole-milk",
    name: "Leche entera",
    aliases: ["leche", "milk"],
    barcode: "840000000109",
    per100: { calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3 },
  },
  {
    id: "apple",
    name: "Manzana",
    aliases: ["manzana", "apple"],
    barcode: "840000000110",
    per100: { calories: 52, protein: 0.3, carbs: 14, fats: 0.2 },
  },
];

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function findQuickLogFoodByBarcode(rawBarcode: string): QuickLogFoodItem | null {
  const barcode = rawBarcode.trim();
  if (!/^\d{8,14}$/.test(barcode)) return null;
  return QUICK_LOG_FOOD_CATALOG.find((item) => item.barcode === barcode) ?? null;
}

export function searchQuickLogFoods(query: string, limit = 8): QuickLogFoodItem[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  return QUICK_LOG_FOOD_CATALOG.filter((item) => {
    const haystack = normalizeQuery([item.name, ...item.aliases].join(" "));
    return haystack.includes(normalized);
  }).slice(0, Math.max(1, limit));
}
