import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/lib/profile";
import { buildProfessionalTrackingInsights, normalizeDailyCheckins } from "@/lib/trackingProfessionalMetrics";
import type { CheckinEntry, MealLogEntry, WorkoutEntry } from "@/services/tracking";

function buildCheckin(overrides: Partial<CheckinEntry>): CheckinEntry {
  return {
    id: overrides.id ?? `checkin-${overrides.date}`,
    date: overrides.date ?? "2026-03-22",
    weightKg: overrides.weightKg ?? 80,
    chestCm: overrides.chestCm ?? 100,
    waistCm: overrides.waistCm ?? 85,
    hipsCm: overrides.hipsCm ?? 98,
    bicepsCm: overrides.bicepsCm ?? 35,
    thighCm: overrides.thighCm ?? 58,
    calfCm: overrides.calfCm ?? 37,
    neckCm: overrides.neckCm ?? 39,
    bodyFatPercent: overrides.bodyFatPercent ?? 18,
    energy: overrides.energy ?? 3,
    hunger: overrides.hunger ?? 3,
    notes: overrides.notes ?? "",
    recommendation: overrides.recommendation ?? "",
    frontPhotoUrl: overrides.frontPhotoUrl ?? null,
    sidePhotoUrl: overrides.sidePhotoUrl ?? null,
  };
}

describe("trackingProfessionalMetrics", () => {
  it("normalizes multiple entries on the same day into one daily snapshot", () => {
    const rows = normalizeDailyCheckins([
      buildCheckin({ id: "a", date: "2026-03-20", weightKg: 80.2, energy: 2, notes: "manana" }),
      buildCheckin({ id: "b", date: "2026-03-20", weightKg: 79.8, energy: 4, notes: "noche", waistCm: 84 }),
      buildCheckin({ id: "c", date: "2026-03-19", weightKg: 80.5 }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe("2026-03-20");
    expect(rows[0].weightKg).toBe(80);
    expect(rows[0].energy).toBe(3);
    expect(rows[0].notes).toBe("noche");
    expect(rows[0].sourceCount).toBe(2);
  });

  it("flags aggressive deficit when loss is too fast with low energy and high hunger", () => {
    const checkins = [
      buildCheckin({ date: "2026-03-22", weightKg: 78.5, waistCm: 82, energy: 2, hunger: 4 }),
      buildCheckin({ date: "2026-03-21", weightKg: 78.6, waistCm: 82.2, energy: 2, hunger: 4 }),
      buildCheckin({ date: "2026-03-20", weightKg: 78.7, waistCm: 82.4, energy: 2, hunger: 4 }),
      buildCheckin({ date: "2026-03-19", weightKg: 78.8, waistCm: 82.5, energy: 2, hunger: 4 }),
      buildCheckin({ date: "2026-03-18", weightKg: 78.9, waistCm: 82.7, energy: 2, hunger: 4 }),
      buildCheckin({ date: "2026-03-17", weightKg: 79.0, waistCm: 82.9, energy: 2, hunger: 4 }),
      buildCheckin({ date: "2026-03-16", weightKg: 79.1, waistCm: 83.1, energy: 2, hunger: 4 }),
      buildCheckin({ date: "2026-03-15", weightKg: 80.2, waistCm: 84, energy: 3, hunger: 3 }),
      buildCheckin({ date: "2026-03-14", weightKg: 80.3, waistCm: 84.2, energy: 3, hunger: 3 }),
      buildCheckin({ date: "2026-03-13", weightKg: 80.4, waistCm: 84.3, energy: 3, hunger: 3 }),
      buildCheckin({ date: "2026-03-12", weightKg: 80.5, waistCm: 84.4, energy: 3, hunger: 3 }),
      buildCheckin({ date: "2026-03-11", weightKg: 80.6, waistCm: 84.5, energy: 3, hunger: 3 }),
      buildCheckin({ date: "2026-03-10", weightKg: 80.7, waistCm: 84.6, energy: 3, hunger: 3 }),
      buildCheckin({ date: "2026-03-09", weightKg: 80.8, waistCm: 84.7, energy: 3, hunger: 3 }),
    ];
    const mealLog: MealLogEntry[] = Array.from({ length: 7 }, (_, index) => ({
      id: `meal-${index}`,
      date: `2026-03-${String(16 + index).padStart(2, "0")}`,
      mealKey: `meal-${index}`,
      mealType: "lunch",
      title: "Meal",
      calories: 600,
      protein: 40,
      carbs: 50,
      fats: 20,
      completedAt: `2026-03-${String(16 + index).padStart(2, "0")}T12:00:00.000Z`,
    }));
    const workoutLog: WorkoutEntry[] = [
      { id: "w1", date: "2026-03-18", name: "A", durationMin: 50, notes: "" },
      { id: "w2", date: "2026-03-20", name: "B", durationMin: 50, notes: "" },
      { id: "w3", date: "2026-03-22", name: "C", durationMin: 50, notes: "" },
    ];

    const insights = buildProfessionalTrackingInsights({
      checkins,
      mealLog,
      workoutLog,
      profile: {
        ...defaultProfile,
        goal: "cut",
        sex: "male",
        trainingPreferences: { ...defaultProfile.trainingPreferences, daysPerWeek: 3 },
      },
      rangeDays: 7,
      now: new Date("2026-03-22T12:00:00.000Z"),
    });

    expect(insights.weeklyRatePct).toBeLessThan(-1);
    expect(insights.alerts.some((alert) => alert.title === "Perdida demasiado rapida")).toBe(true);
    expect(insights.recoveryCorrelation.some((entry) => entry.title === "Deficit agresivo probable")).toBe(true);
  });

  it("detects probable recomp and waist hip insight when weight is stable and waist drops", () => {
    const insights = buildProfessionalTrackingInsights({
      checkins: [
        buildCheckin({ date: "2026-03-22", weightKg: 70.0, waistCm: 73.8, hipsCm: 98, bodyFatPercent: 20.4 }),
        buildCheckin({ date: "2026-03-21", weightKg: 70.1, waistCm: 74.0, hipsCm: 98, bodyFatPercent: 20.5 }),
        buildCheckin({ date: "2026-03-20", weightKg: 70.0, waistCm: 74.1, hipsCm: 98, bodyFatPercent: 20.4 }),
        buildCheckin({ date: "2026-03-19", weightKg: 70.0, waistCm: 74.2, hipsCm: 98, bodyFatPercent: 20.5 }),
        buildCheckin({ date: "2026-03-18", weightKg: 70.1, waistCm: 74.3, hipsCm: 98, bodyFatPercent: 20.6 }),
        buildCheckin({ date: "2026-03-17", weightKg: 70.0, waistCm: 74.3, hipsCm: 98, bodyFatPercent: 20.7 }),
        buildCheckin({ date: "2026-03-16", weightKg: 70.1, waistCm: 74.4, hipsCm: 98, bodyFatPercent: 20.7 }),
        buildCheckin({ date: "2026-03-15", weightKg: 70.1, waistCm: 75.2, hipsCm: 98, bodyFatPercent: 21.0 }),
        buildCheckin({ date: "2026-03-14", weightKg: 70.0, waistCm: 75.3, hipsCm: 98, bodyFatPercent: 21.0 }),
        buildCheckin({ date: "2026-03-13", weightKg: 70.2, waistCm: 75.4, hipsCm: 98, bodyFatPercent: 21.1 }),
        buildCheckin({ date: "2026-03-12", weightKg: 70.1, waistCm: 75.4, hipsCm: 98, bodyFatPercent: 21.1 }),
        buildCheckin({ date: "2026-03-11", weightKg: 70.1, waistCm: 75.5, hipsCm: 98, bodyFatPercent: 21.2 }),
        buildCheckin({ date: "2026-03-10", weightKg: 70.0, waistCm: 75.5, hipsCm: 98, bodyFatPercent: 21.2 }),
        buildCheckin({ date: "2026-03-09", weightKg: 70.1, waistCm: 75.6, hipsCm: 98, bodyFatPercent: 21.3 }),
      ],
      mealLog: [],
      workoutLog: [],
      profile: { ...defaultProfile, goal: "maintain", sex: "female" },
      rangeDays: 7,
      now: new Date("2026-03-22T12:00:00.000Z"),
    });

    expect(insights.bodyCompositionSignals.some((signal) => signal.title === "Recomposicion probable")).toBe(true);
    expect(insights.waistHip?.ratio).toBe(0.75);
    expect(insights.waistHip?.assessment.label).toBe("Lectura favorable");
  });

  it("recalculates windows, adherence and history by selected range", () => {
    const now = new Date("2026-03-22T12:00:00.000Z");
    const checkins = Array.from({ length: 90 }, (_, index) => {
      const date = new Date(now);
      date.setUTCDate(now.getUTCDate() - index);
      const dateKey = date.toISOString().slice(0, 10);

      let weightKg = 79.9;
      if (index >= 7 && index <= 13) weightKg = 80.3;
      if (index >= 14 && index <= 27) weightKg = 80.8;
      if (index >= 28 && index <= 55) weightKg = 81.6;
      if (index >= 56) weightKg = 82.6;

      return buildCheckin({
        date: dateKey,
        weightKg,
        waistCm: 84 - (index * 0.03),
        energy: index < 14 ? 3 : 4,
        hunger: index < 14 ? 3 : 2,
      });
    });

    const mealLog: MealLogEntry[] = Array.from({ length: 15 }, (_, index) => {
      const date = new Date(now);
      date.setUTCDate(now.getUTCDate() - (index * 2));
      const dateKey = date.toISOString().slice(0, 10);
      return {
        id: `meal-${index}`,
        date: dateKey,
        mealKey: `meal-${index}`,
        mealType: "lunch",
        title: "Meal",
        calories: 650,
        protein: 40,
        carbs: 55,
        fats: 22,
        completedAt: `${dateKey}T12:00:00.000Z`,
      };
    });

    const workoutLog: WorkoutEntry[] = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now);
      date.setUTCDate(now.getUTCDate() - (index * 2));
      return {
        id: `workout-${index}`,
        date: date.toISOString().slice(0, 10),
        name: `Workout ${index}`,
        durationMin: 50,
        notes: "",
      };
    });

    const profile = {
      ...defaultProfile,
      goal: "cut" as const,
      trainingPreferences: { ...defaultProfile.trainingPreferences, daysPerWeek: 4 },
    };

    const weekInsights = buildProfessionalTrackingInsights({ checkins, mealLog, workoutLog, profile, rangeDays: 7, now });
    const monthInsights = buildProfessionalTrackingInsights({ checkins, mealLog, workoutLog, profile, rangeDays: 30, now });
    const quarterInsights = buildProfessionalTrackingInsights({ checkins, mealLog, workoutLog, profile, rangeDays: 90, now });

    expect(weekInsights.rangeConfig.windowDays).toBe(7);
    expect(monthInsights.rangeConfig.windowDays).toBe(14);
    expect(quarterInsights.rangeConfig.windowDays).toBe(28);
    expect(weekInsights.currentWindow?.daysLogged).toBe(7);
    expect(monthInsights.currentWindow?.daysLogged).toBe(14);
    expect(quarterInsights.currentWindow?.daysLogged).toBe(28);
    expect(weekInsights.historyRows).toHaveLength(7);
    expect(monthInsights.historyRows).toHaveLength(30);
    expect(quarterInsights.historyRows).toHaveLength(90);
    expect(monthInsights.nutritionLoggingPct).toBeGreaterThan(quarterInsights.nutritionLoggingPct);
    expect(monthInsights.trainingConsistencyPct).toBeGreaterThan(quarterInsights.trainingConsistencyPct);
    expect(weekInsights.weeklyRatePct).not.toBe(monthInsights.weeklyRatePct);
    expect(monthInsights.weeklyRatePct).not.toBe(quarterInsights.weeklyRatePct);
  });
});
