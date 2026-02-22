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

export const trackingSchema = z.object({
  checkins: z.array(checkinSchema),
  foodLog: z.array(foodEntrySchema),
  workoutLog: z.array(workoutEntrySchema),
});

export const trackingDeleteSchema = z.object({
  collection: z.enum(["checkins", "foodLog", "workoutLog"]),
  id: z.string().min(1),
});

export const trackingCollectionSchema = z.object({
  collection: z.enum(["checkins", "foodLog", "workoutLog"]),
});

export const trackingEntryCreateSchema = z.discriminatedUnion("collection", [
  z.object({ collection: z.literal("checkins"), item: checkinSchema }),
  z.object({ collection: z.literal("foodLog"), item: foodEntrySchema }),
  z.object({ collection: z.literal("workoutLog"), item: workoutEntrySchema }),
]);

export type TrackingCollection = z.infer<typeof trackingCollectionSchema>["collection"];
export type CheckinEntry = z.infer<typeof checkinSchema>;
export type FoodEntry = z.infer<typeof foodEntrySchema>;
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>;
export type TrackingSnapshot = z.infer<typeof trackingSchema>;
export type TrackingEntryCreateInput = z.infer<typeof trackingEntryCreateSchema>;

export const defaultTracking: TrackingSnapshot = {
  checkins: [],
  foodLog: [],
  workoutLog: [],
};
