import { z } from "zod";

// Meal type enum matching Prisma
export const mealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
export type MealType = z.infer<typeof mealTypeSchema>;

// Item within a meal log
export const mealItemSchema = z.object({
  name: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fats: z.number().optional(),
});
export type MealItem = z.infer<typeof mealItemSchema>;

// Create meal log request
export const createMealLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  mealType: mealTypeSchema,
  title: z.string().min(1, "Title is required"),
  items: z.array(mealItemSchema).optional().default([]),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fats: z.number().nonnegative().optional(),
});
export type CreateMealLogInput = z.infer<typeof createMealLogSchema>;

// Update meal log request
export const updateMealLogSchema = z.object({
  title: z.string().min(1).optional(),
  items: z.array(mealItemSchema).optional(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fats: z.number().nonnegative().optional(),
  completed: z.boolean().optional(), // Special field to set/unset completedAt
});
export type UpdateMealLogInput = z.infer<typeof updateMealLogSchema>;

// Query params for GET /meals
export const getMealsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mealType: mealTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type GetMealsQuery = z.infer<typeof getMealsQuerySchema>;

// Meal log response (from API)
export const mealLogResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(), // YYYY-MM-DD
  mealType: mealTypeSchema,
  title: z.string(),
  items: z.array(mealItemSchema),
  calories: z.number().nullable(),
  protein: z.number().nullable(),
  carbs: z.number().nullable(),
  fats: z.number().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type MealLogResponse = z.infer<typeof mealLogResponseSchema>;

// List response
export const mealLogListResponseSchema = z.object({
  items: z.array(mealLogResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type MealLogListResponse = z.infer<typeof mealLogListResponseSchema>;

// Helper to convert Prisma MealLog to API response
export function mealLogToResponse(mealLog: {
  id: string;
  userId: string;
  date: Date;
  mealType: MealType;
  title: string;
  items: unknown;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): MealLogResponse {
  return {
    id: mealLog.id,
    userId: mealLog.userId,
    date: mealLog.date.toISOString().split("T")[0],
    mealType: mealLog.mealType,
    title: mealLog.title,
    items: Array.isArray(mealLog.items) ? mealLog.items as MealItem[] : [],
    calories: mealLog.calories,
    protein: mealLog.protein,
    carbs: mealLog.carbs,
    fats: mealLog.fats,
    completedAt: mealLog.completedAt,
    createdAt: mealLog.createdAt,
    updatedAt: mealLog.updatedAt,
  };
}