"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";

type CheckinEntry = {
  id: string;
  date: string;
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  bicepsCm: number;
  thighCm: number;
  calfCm: number;
  neckCm: number;
  bodyFatPercent: number;
  energy: number;
  hunger: number;
  notes: string;
  recommendation: string;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
};

type FoodEntry = {
  id: string;
  date: string;
  foodKey: string;
  grams: number;
};

type WorkoutEntry = {
  id: string;
  date: string;
  name: string;
  durationMin: number;
  notes: string;
};

const CHECKIN_KEY = "fs_checkins_v1";
const PROFILE_KEY = "fs_profile_v1";
const FOOD_LOG_KEY = "fs_food_log_v1";
const WORKOUT_LOG_KEY = "fs_workout_log_v1";

const foodProfiles: Record<
  string,
  { label: string; protein: number; carbs: number; fat: number }
> = {
  salmon: { label: "Salmón", protein: 20, carbs: 0, fat: 13 },
  eggs: { label: "Huevos", protein: 13, carbs: 1.1, fat: 10 },
  chicken: { label: "Pollo", protein: 31, carbs: 0, fat: 3.6 },
  rice: { label: "Arroz integral", protein: 2.7, carbs: 28, fat: 0.3 },
  quinoa: { label: "Quinoa", protein: 4.4, carbs: 21, fat: 1.9 },
  yogurt: { label: "Yogur griego", protein: 10, carbs: 4, fat: 4 },
  potatoes: { label: "Patata", protein: 2, carbs: 17, fat: 0.1 },
  avocado: { label: "Aguacate", protein: 2, carbs: 9, fat: 15 },
};

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export default function TrackingClient() {
  const c = copy.es;
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [checkinDate, setCheckinDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkinWeight, setCheckinWeight] = useState(75);
  const [checkinChest, setCheckinChest] = useState(90);
  const [checkinWaist, setCheckinWaist] = useState(80);
  const [checkinHips, setCheckinHips] = useState(95);
  const [checkinBiceps, setCheckinBiceps] = useState(32);
  const [checkinThigh, setCheckinThigh] = useState(55);
  const [checkinCalf, setCheckinCalf] = useState(36);
  const [checkinNeck, setCheckinNeck] = useState(37);
  const [checkinBodyFat, setCheckinBodyFat] = useState(18);
  const [checkinEnergy, setCheckinEnergy] = useState(3);
  const [checkinHunger, setCheckinHunger] = useState(3);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinFrontPhoto, setCheckinFrontPhoto] = useState<string | null>(null);
  const [checkinSidePhoto, setCheckinSidePhoto] = useState<string | null>(null);

  const [foodDate, setFoodDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [foodKey, setFoodKey] = useState("salmon");
  const [foodGrams, setFoodGrams] = useState(150);
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([]);

  const [workoutDate, setWorkoutDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState(45);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutLog, setWorkoutLog] = useState<WorkoutEntry[]>([]);


  useEffect(() => {
    setCheckins(loadJson(CHECKIN_KEY, []));
    setFoodLog(loadJson(FOOD_LOG_KEY, []));
    setWorkoutLog(loadJson(WORKOUT_LOG_KEY, []));
  }, []);

  useEffect(() => saveJson(CHECKIN_KEY, checkins), [checkins]);
  useEffect(() => saveJson(FOOD_LOG_KEY, foodLog), [foodLog]);
  useEffect(() => saveJson(WORKOUT_LOG_KEY, workoutLog), [workoutLog]);

  function handlePhoto(
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string | null) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function buildRecommendation(currentWeight: number) {
    if (checkins.length === 0) return c.profile.checkinKeep;
    const latest = [...checkins].sort((a, b) => b.date.localeCompare(a.date))[0];
    const delta = currentWeight - latest.weightKg;
    const profile = loadJson(PROFILE_KEY, { goal: "maintain" });

    if (profile.goal === "cut") {
      if (delta >= 0) return c.profile.checkinReduceCalories;
      return c.profile.checkinKeep;
    }

    if (profile.goal === "bulk") {
      if (delta <= 0) return c.profile.checkinIncreaseCalories;
      return c.profile.checkinKeep;
    }

    if (checkinEnergy <= 2 || checkinHunger >= 4) return c.profile.checkinIncreaseProtein;
    return c.profile.checkinKeep;
  }

  function addCheckin(e: React.FormEvent) {
    e.preventDefault();
    const recommendation = buildRecommendation(checkinWeight);
    const entry: CheckinEntry = {
      id: `${checkinDate}-${Date.now()}`,
      date: checkinDate,
      weightKg: Number(checkinWeight),
      chestCm: Number(checkinChest),
      waistCm: Number(checkinWaist),
      hipsCm: Number(checkinHips),
      bicepsCm: Number(checkinBiceps),
      thighCm: Number(checkinThigh),
      calfCm: Number(checkinCalf),
      neckCm: Number(checkinNeck),
      bodyFatPercent: Number(checkinBodyFat),
      energy: Number(checkinEnergy),
      hunger: Number(checkinHunger),
      notes: checkinNotes.trim(),
      recommendation,
      frontPhotoUrl: checkinFrontPhoto,
      sidePhotoUrl: checkinSidePhoto,
    };

    setCheckins((prev) => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setCheckinNotes("");
    setCheckinFrontPhoto(null);
    setCheckinSidePhoto(null);

    const profile = loadJson(PROFILE_KEY, null);
    if (profile) {
      const next = {
        ...profile,
        weightKg: entry.weightKg,
        measurements: {
          chestCm: entry.chestCm,
          waistCm: entry.waistCm,
          hipsCm: entry.hipsCm,
          bicepsCm: entry.bicepsCm,
          thighCm: entry.thighCm,
          calfCm: entry.calfCm,
          neckCm: entry.neckCm,
          bodyFatPercent: entry.bodyFatPercent,
        },
      };
      saveJson(PROFILE_KEY, next);
    }
  }

  function addFoodEntry(e: React.FormEvent) {
    e.preventDefault();
    const entry: FoodEntry = {
      id: `${foodDate}-${Date.now()}`,
      date: foodDate,
      foodKey,
      grams: Number(foodGrams),
    };
    setFoodLog((prev) => [entry, ...prev]);
  }

  function addWorkoutEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!workoutName.trim()) return;
    const entry: WorkoutEntry = {
      id: `${workoutDate}-${Date.now()}`,
      date: workoutDate,
      name: workoutName.trim(),
      durationMin: Number(workoutDuration),
      notes: workoutNotes.trim(),
    };
    setWorkoutLog((prev) => [entry, ...prev]);
    setWorkoutName("");
    setWorkoutNotes("");
  }

  const mealsByDate = useMemo(() => {
    return foodLog.reduce<Record<string, FoodEntry[]>>((acc, entry) => {
      acc[entry.date] = acc[entry.date] ? [...acc[entry.date], entry] : [entry];
      return acc;
    }, {});
  }, [foodLog]);

  function macroTotals(entries: FoodEntry[]) {
    return entries.reduce(
      (totals, entry) => {
        const profile = foodProfiles[entry.foodKey];
        const factor = entry.grams / 100;
        totals.protein += profile.protein * factor;
        totals.carbs += profile.carbs * factor;
        totals.fat += profile.fat * factor;
        return totals;
      },
      { protein: 0, carbs: 0, fat: 0 }
    );
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <h2>{c.profile.checkinTitle}</h2>
        <p>{c.profile.checkinSubtitle}</p>
        <form onSubmit={addCheckin} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinDate}
              <input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinWeight}
              <input type="number" min={30} max={250} step="0.1" value={checkinWeight} onChange={(e) => setCheckinWeight(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.chest}
              <input type="number" min={0} value={checkinChest} onChange={(e) => setCheckinChest(Number(e.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.waist}
              <input type="number" min={0} value={checkinWaist} onChange={(e) => setCheckinWaist(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.hips}
              <input type="number" min={0} value={checkinHips} onChange={(e) => setCheckinHips(Number(e.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.biceps}
              <input type="number" min={0} value={checkinBiceps} onChange={(e) => setCheckinBiceps(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.thigh}
              <input type="number" min={0} value={checkinThigh} onChange={(e) => setCheckinThigh(Number(e.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.calf}
              <input type="number" min={0} value={checkinCalf} onChange={(e) => setCheckinCalf(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.neck}
              <input type="number" min={0} value={checkinNeck} onChange={(e) => setCheckinNeck(Number(e.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.bodyFat}
              <input type="number" min={0} max={60} step="0.1" value={checkinBodyFat} onChange={(e) => setCheckinBodyFat(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinEnergy}
              <input type="number" min={1} max={5} value={checkinEnergy} onChange={(e) => setCheckinEnergy(Number(e.target.value))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.profile.checkinHunger}
              <input type="number" min={1} max={5} value={checkinHunger} onChange={(e) => setCheckinHunger(Number(e.target.value))} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            {c.profile.checkinNotes}
            <textarea value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} rows={3} />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>{c.profile.checkinPhotos}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.checkinFrontPhoto}
                <input type="file" accept="image/*" onChange={(e) => handlePhoto(e, setCheckinFrontPhoto)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                {c.profile.checkinSidePhoto}
                <input type="file" accept="image/*" onChange={(e) => handlePhoto(e, setCheckinSidePhoto)} />
              </label>
            </div>
            <span style={{ opacity: 0.7 }}>{c.profile.checkinPhotoHint}</span>
          </div>

          <button type="submit" style={{ width: "fit-content" }}>
            {c.profile.checkinAdd}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {checkins.length === 0 ? (
            <p style={{ opacity: 0.7 }}>{c.profile.checkinEmpty}</p>
          ) : (
            checkins.map((entry) => (
              <div key={entry.id} style={{ border: "1px solid #ededed", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{entry.date}</strong>
                  <span>
                    {entry.weightKg} kg · {entry.waistCm} cm
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>
                  {c.profile.checkinRecommendation}: <strong>{entry.recommendation}</strong>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                  {entry.frontPhotoUrl && (
                    <img src={entry.frontPhotoUrl} alt="Frontal" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }} />
                  )}
                  {entry.sidePhotoUrl && (
                    <img src={entry.sidePhotoUrl} alt="Perfil" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }} />
                  )}
                </div>
                {entry.notes && <p style={{ marginTop: 6, opacity: 0.75 }}>{entry.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2>{c.tracking.sectionMeals}</h2>
        <form onSubmit={addFoodEntry} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.tracking.mealDate}
              <input type="date" value={foodDate} onChange={(e) => setFoodDate(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.tracking.mealFood}
              <select value={foodKey} onChange={(e) => setFoodKey(e.target.value)}>
                {Object.entries(foodProfiles).map(([key, profile]) => (
                  <option key={key} value={key}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.tracking.mealGrams}
              <input type="number" min={0} value={foodGrams} onChange={(e) => setFoodGrams(Number(e.target.value))} />
            </label>
          </div>
          <button type="submit" style={{ width: "fit-content" }}>
            {c.tracking.mealAdd}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {Object.keys(mealsByDate).length === 0 ? (
            <p style={{ opacity: 0.7 }}>{c.tracking.mealEmpty}</p>
          ) : (
            Object.entries(mealsByDate).map(([date, entries]) => {
              const totals = macroTotals(entries);
              return (
                <div key={date} style={{ border: "1px solid #ededed", borderRadius: 10, padding: 12 }}>
                  <strong>{date}</strong>
                  <div style={{ marginTop: 6 }}>
                    {c.tracking.mealTotals}: {totals.protein.toFixed(1)}g P · {totals.carbs.toFixed(1)}g C · {totals.fat.toFixed(1)}g G
                  </div>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {entries.map((entry) => {
                      const profile = foodProfiles[entry.foodKey];
                      const factor = entry.grams / 100;
                      return (
                        <li key={entry.id}>
                          {profile.label} {entry.grams}g → {(profile.protein * factor).toFixed(1)}P / {(profile.carbs * factor).toFixed(1)}C / {(profile.fat * factor).toFixed(1)}G
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <h2>{c.tracking.sectionWorkouts}</h2>
        <form onSubmit={addWorkoutEntry} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              {c.tracking.workoutDate}
              <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.tracking.workoutName}
              <input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              {c.tracking.workoutDuration}
              <input type="number" min={0} value={workoutDuration} onChange={(e) => setWorkoutDuration(Number(e.target.value))} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            {c.tracking.workoutNotes}
            <textarea value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} rows={2} />
          </label>
          <button type="submit" style={{ width: "fit-content" }}>
            {c.tracking.workoutAdd}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {workoutLog.length === 0 ? (
            <p style={{ opacity: 0.7 }}>{c.tracking.workoutEmpty}</p>
          ) : (
            workoutLog.map((entry) => (
              <div key={entry.id} style={{ border: "1px solid #ededed", borderRadius: 10, padding: 12 }}>
                <strong>{entry.date}</strong> — {entry.name} ({entry.durationMin} min)
                {entry.notes && <p style={{ marginTop: 6, opacity: 0.75 }}>{entry.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
