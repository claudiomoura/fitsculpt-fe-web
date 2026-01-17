"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/i18n";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getUserProfile, saveCheckinAndSyncProfileMetrics } from "@/lib/profileService";

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

type TrackingPayload = {
  checkins: CheckinEntry[];
  foodLog: FoodEntry[];
  workoutLog: WorkoutEntry[];
};

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
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [trackingLoaded, setTrackingLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const loadTracking = async () => {
      try {
        const response = await fetch("/api/tracking", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as TrackingPayload;
        if (!active) return;
        setCheckins(data.checkins ?? []);
        setFoodLog(data.foodLog ?? []);
        setWorkoutLog(data.workoutLog ?? []);
        setTrackingLoaded(true);
      } catch {
        setTrackingLoaded(true);
      }
    };

    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (active) {
          setProfile(data);
          setCheckinWeight(data.weightKg);
          setCheckinChest(data.measurements.chestCm);
          setCheckinWaist(data.measurements.waistCm);
          setCheckinHips(data.measurements.hipsCm);
          setCheckinBiceps(data.measurements.bicepsCm);
          setCheckinThigh(data.measurements.thighCm);
          setCheckinCalf(data.measurements.calfCm);
          setCheckinNeck(data.measurements.neckCm);
          setCheckinBodyFat(data.measurements.bodyFatPercent);
        }
      } catch {
        // Ignore load errors.
      }
    };

    void loadTracking();
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!trackingLoaded) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkins, foodLog, workoutLog }),
      });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [checkins, foodLog, workoutLog, trackingLoaded]);

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

  async function addCheckin(e: React.FormEvent) {
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

    const nextCheckins = [entry, ...checkins].sort((a, b) => b.date.localeCompare(a.date));
    setCheckins(nextCheckins);
    setCheckinNotes("");
    setCheckinFrontPhoto(null);
    setCheckinSidePhoto(null);

    const nextProfile = await saveCheckinAndSyncProfileMetrics(
      { checkins: nextCheckins, foodLog, workoutLog },
      profile,
      {
        weightKg: entry.weightKg,
        chestCm: entry.chestCm,
        waistCm: entry.waistCm,
        hipsCm: entry.hipsCm,
        bicepsCm: entry.bicepsCm,
        thighCm: entry.thighCm,
        calfCm: entry.calfCm,
        neckCm: entry.neckCm,
        bodyFatPercent: entry.bodyFatPercent,
      }
    );
    setProfile(nextProfile);
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

  const checkinChart = useMemo(() => {
    if (checkins.length === 0) return [];
    const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
    const weights = sorted.map((entry) => entry.weightKg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = Math.max(1, max - min);
    return sorted.map((entry) => ({
      date: entry.date,
      weight: entry.weightKg,
      bodyFat: entry.bodyFatPercent,
      percent: ((entry.weightKg - min) / range) * 100,
    }));
  }, [checkins]);

  return (
    <div className="page">
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{c.profile.checkinTitle}</h2>
            <p className="section-subtitle">{c.profile.checkinSubtitle}</p>
          </div>
        </div>
        <form onSubmit={addCheckin} className="form-stack">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {c.profile.checkinDate}
              <input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} />
            </label>
            <label className="form-stack">
              {c.profile.checkinWeight}
              <input type="number" min={30} max={250} step="0.1" value={checkinWeight} onChange={(e) => setCheckinWeight(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {c.profile.chest}
              <input type="number" min={0} value={checkinChest} onChange={(e) => setCheckinChest(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {c.profile.waist}
              <input type="number" min={0} value={checkinWaist} onChange={(e) => setCheckinWaist(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {c.profile.hips}
              <input type="number" min={0} value={checkinHips} onChange={(e) => setCheckinHips(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {c.profile.biceps}
              <input type="number" min={0} value={checkinBiceps} onChange={(e) => setCheckinBiceps(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {c.profile.thigh}
              <input type="number" min={0} value={checkinThigh} onChange={(e) => setCheckinThigh(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {c.profile.calf}
              <input type="number" min={0} value={checkinCalf} onChange={(e) => setCheckinCalf(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {c.profile.neck}
              <input type="number" min={0} value={checkinNeck} onChange={(e) => setCheckinNeck(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {c.profile.bodyFat}
              <input type="number" min={0} max={60} step="0.1" value={checkinBodyFat} onChange={(e) => setCheckinBodyFat(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {c.profile.checkinEnergy}
              <input type="number" min={1} max={5} value={checkinEnergy} onChange={(e) => setCheckinEnergy(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {c.profile.checkinHunger}
              <input type="number" min={1} max={5} value={checkinHunger} onChange={(e) => setCheckinHunger(Number(e.target.value))} />
            </label>
          </div>

          <label className="form-stack">
            {c.profile.checkinNotes}
            <textarea value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} rows={3} />
          </label>

          <div className="form-stack">
            <div style={{ fontWeight: 600 }}>{c.profile.checkinPhotos}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {c.profile.checkinFrontPhoto}
                <input type="file" accept="image/*" onChange={(e) => handlePhoto(e, setCheckinFrontPhoto)} />
              </label>
              <label className="form-stack">
                {c.profile.checkinSidePhoto}
                <input type="file" accept="image/*" onChange={(e) => handlePhoto(e, setCheckinSidePhoto)} />
              </label>
            </div>
            <span className="muted">{c.profile.checkinPhotoHint}</span>
          </div>

          <button type="submit" className="btn" style={{ width: "fit-content" }}>
            {c.profile.checkinAdd}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {checkins.length === 0 ? (
            <p className="muted">{c.profile.checkinEmpty}</p>
          ) : (
            checkins.map((entry) => (
              <div key={entry.id} className="feature-card">
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
                {entry.notes && <p style={{ marginTop: 6 }} className="muted">{entry.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>Progreso semanal</h2>
            <p className="section-subtitle">Visualiza la evolución de peso y % de grasa.</p>
          </div>
        </div>
        {checkinChart.length === 0 ? (
          <p className="muted">Aún no hay datos suficientes para gráficos.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {checkinChart.map((point) => (
              <div key={point.date} className="info-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{point.date}</strong>
                  <span className="muted">{point.weight} kg · {point.bodyFat}%</span>
                </div>
                <div style={{ marginTop: 8, background: "#fef3c7", borderRadius: 999, overflow: "hidden", height: 10 }}>
                  <div
                    style={{
                      width: `${point.percent}%`,
                      height: "100%",
                      background: "var(--primary)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.tracking.sectionMeals}</h2>
        <form onSubmit={addFoodEntry} className="form-stack">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {c.tracking.mealDate}
              <input type="date" value={foodDate} onChange={(e) => setFoodDate(e.target.value)} />
            </label>
            <label className="form-stack">
              {c.tracking.mealFood}
              <select value={foodKey} onChange={(e) => setFoodKey(e.target.value)}>
                {Object.entries(foodProfiles).map(([key, profile]) => (
                  <option key={key} value={key}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-stack">
              {c.tracking.mealGrams}
              <input type="number" min={0} value={foodGrams} onChange={(e) => setFoodGrams(Number(e.target.value))} />
            </label>
          </div>
          <button type="submit" className="btn" style={{ width: "fit-content" }}>
            {c.tracking.mealAdd}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {Object.keys(mealsByDate).length === 0 ? (
            <p className="muted">{c.tracking.mealEmpty}</p>
          ) : (
            Object.entries(mealsByDate).map(([date, entries]) => {
              const totals = macroTotals(entries);
              return (
                <div key={date} className="feature-card">
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

      <section className="card">
        <h2 className="section-title" style={{ fontSize: 20 }}>{c.tracking.sectionWorkouts}</h2>
        <form onSubmit={addWorkoutEntry} className="form-stack">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {c.tracking.workoutDate}
              <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} />
            </label>
            <label className="form-stack">
              {c.tracking.workoutName}
              <input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
            </label>
            <label className="form-stack">
              {c.tracking.workoutDuration}
              <input type="number" min={0} value={workoutDuration} onChange={(e) => setWorkoutDuration(Number(e.target.value))} />
            </label>
          </div>
          <label className="form-stack">
            {c.tracking.workoutNotes}
            <textarea value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} rows={2} />
          </label>
          <button type="submit" className="btn" style={{ width: "fit-content" }}>
            {c.tracking.workoutAdd}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {workoutLog.length === 0 ? (
            <p className="muted">{c.tracking.workoutEmpty}</p>
          ) : (
            workoutLog.map((entry) => (
              <div key={entry.id} className="feature-card">
                <strong>{entry.date}</strong> — {entry.name} ({entry.durationMin} min)
                {entry.notes && <p style={{ marginTop: 6 }} className="muted">{entry.notes}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
