import { z } from "zod";

export const checkinSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  weightKg: z.number(),
  chestCm: z.number(),
  waistCm: z.number(),
  hipsCm: z.number(),
  bicepsCm: z.number(),
  thighCm: z.number(),
  calfCm: z.number(),
  neckCm: z.number(),
  bodyFatPercent: z.number(),
  energy: z.number(),
  hunger: z.number(),
  notes: z.string(),
  recommendation: z.string(),
  frontPhotoUrl: z.string().nullable(),
  sidePhotoUrl: z.string().nullable(),
});

export const foodEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  foodKey: z.string().min(1),
  grams: z.number(),
});

export const workoutEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  name: z.string().min(1),
  durationMin: z.number(),
  notes: z.string(),
});

export const mealLogEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  mealKey: z.string().min(1),
  mealType: z.string().min(1),
  title: z.string().min(1),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  completedAt: z.string().min(1),
});

export const passiveHealthSourceSchema = z.enum([
  "manual",
  "demo",
  "apple_health",
  "google_fit",
  "health_connect",
  "fitbit",
  "garmin",
  "smart_scale",
  "wearable",
  "other",
]);

export const passiveHealthSnapshotSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: passiveHealthSourceSchema,
  provider: z.string().trim().min(1).max(64).nullable(),
  steps: z.number().int().min(0).max(100000).nullable(),
  activeCalories: z.number().min(0).max(10000).nullable(),
  activeMinutes: z.number().int().min(0).max(1440).nullable(),
  sleepHours: z.number().min(0).max(24).nullable(),
  restingHeartRate: z.number().int().min(20).max(240).nullable(),
  bodyWeightKg: z.number().min(20).max(400).nullable().optional(),
  bodyFatPercent: z.number().min(2).max(80).nullable().optional(),
  exerciseSessions: z.number().int().min(0).max(20),
  note: z.string().max(240),
  syncedAt: z.string().datetime(),
});

export const passiveHealthDataSchema = z.object({
  snapshots: z.array(passiveHealthSnapshotSchema).max(180),
  lastSyncAt: z.string().datetime().nullable(),
  lastSyncSource: passiveHealthSourceSchema.nullable(),
});

export const trackingSchema = z.object({
  checkins: z.array(checkinSchema),
  foodLog: z.array(foodEntrySchema),
  workoutLog: z.array(workoutEntrySchema),
  mealLog: z.array(mealLogEntrySchema),
  passiveData: passiveHealthDataSchema.default({
    snapshots: [],
    lastSyncAt: null,
    lastSyncSource: null,
  }),
});

export const trackingDeleteSchema = z.object({
  collection: z.enum(["checkins", "foodLog", "workoutLog", "mealLog"]),
  id: z.string().min(1),
});

export const trackingCollectionSchema = z.object({
  collection: z.enum(["checkins", "foodLog", "workoutLog", "mealLog"]),
});

export const trackingEntryCreateSchema = z.discriminatedUnion("collection", [
  z.object({ collection: z.literal("checkins"), item: checkinSchema }),
  z.object({ collection: z.literal("foodLog"), item: foodEntrySchema }),
  z.object({ collection: z.literal("workoutLog"), item: workoutEntrySchema }),
  z.object({ collection: z.literal("mealLog"), item: mealLogEntrySchema }),
]);

export type TrackingCollection = z.infer<typeof trackingCollectionSchema>["collection"];
export type CheckinEntry = z.infer<typeof checkinSchema>;
export type FoodEntry = z.infer<typeof foodEntrySchema>;
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>;
export type MealLogEntry = z.infer<typeof mealLogEntrySchema>;
export type PassiveHealthSource = z.infer<typeof passiveHealthSourceSchema>;
export type PassiveHealthSnapshot = z.infer<typeof passiveHealthSnapshotSchema>;
export type PassiveHealthData = z.infer<typeof passiveHealthDataSchema>;
export type TrackingSnapshot = z.infer<typeof trackingSchema>;
export type TrackingEntryCreateInput = z.infer<typeof trackingEntryCreateSchema>;

export const defaultTracking: TrackingSnapshot = {
  checkins: [],
  foodLog: [],
  workoutLog: [],
  mealLog: [],
  passiveData: {
    snapshots: [],
    lastSyncAt: null,
    lastSyncSource: null,
  },
};
