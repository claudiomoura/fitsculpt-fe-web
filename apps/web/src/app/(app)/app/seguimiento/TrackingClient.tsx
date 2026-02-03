"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getUserProfile, saveCheckinAndSyncProfileMetrics } from "@/lib/profileService";
import { Skeleton } from "@/components/ui/Skeleton";

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

type CheckinMetrics = {
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  bicepsCm: number;
  thighCm: number;
  calfCm: number;
  neckCm: number;
  bodyFatPercent: number;
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

type UserFood = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: "100g" | "serving" | "unit";
  brand?: string | null;
};

const defaultFoodProfiles: Record<
  string,
  { labelKey: string; protein: number; carbs: number; fat: number }
> = {
  salmon: { labelKey: "tracking.foods.salmon", protein: 20, carbs: 0, fat: 13 },
  eggs: { labelKey: "tracking.foods.eggs", protein: 13, carbs: 1.1, fat: 10 },
  chicken: { labelKey: "tracking.foods.chicken", protein: 31, carbs: 0, fat: 3.6 },
  rice: { labelKey: "tracking.foods.rice", protein: 2.7, carbs: 28, fat: 0.3 },
  quinoa: { labelKey: "tracking.foods.quinoa", protein: 4.4, carbs: 21, fat: 1.9 },
  yogurt: { labelKey: "tracking.foods.yogurt", protein: 10, carbs: 4, fat: 4 },
  potatoes: { labelKey: "tracking.foods.potatoes", protein: 2, carbs: 17, fat: 0.1 },
  avocado: { labelKey: "tracking.foods.avocado", protein: 2, carbs: 9, fat: 15 }
};

type TrackingPayload = {
  checkins: CheckinEntry[];
  foodLog: FoodEntry[];
  workoutLog: WorkoutEntry[];
};

export default function TrackingClient() {
  const { t } = useLanguage();
  const CHECKIN_MODE_KEY = "fs_checkin_mode_v1";
  const SHOW_WORKOUT_LOG = false;
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
  const [energyDate, setEnergyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [energyValue, setEnergyValue] = useState(3);
  const [notesDate, setNotesDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notesValue, setNotesValue] = useState("");
  const [checkinFrontPhoto, setCheckinFrontPhoto] = useState<string | null>(null);
  const [checkinSidePhoto, setCheckinSidePhoto] = useState<string | null>(null);
  const [checkinMode, setCheckinMode] = useState<"quick" | "full">(() => {
    if (typeof window === "undefined") return "quick";
    const storedMode = window.localStorage.getItem(CHECKIN_MODE_KEY);
    return storedMode === "quick" || storedMode === "full" ? storedMode : "quick";
  });


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
  const [trackingStatus, setTrackingStatus] = useState<"loading" | "ready" | "error">("loading");
  const [userFoods, setUserFoods] = useState<UserFood[]>([]);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [foodForm, setFoodForm] = useState({
    id: "",
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    unit: "100g" as UserFood["unit"],
    brand: "",
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEnergySubmitting, setIsEnergySubmitting] = useState(false);
  const [energySubmitError, setEnergySubmitError] = useState<string | null>(null);
  const [isNotesSubmitting, setIsNotesSubmitting] = useState(false);
  const [notesSubmitError, setNotesSubmitError] = useState<string | null>(null);
  const [trackingSupports, setTrackingSupports] = useState<{ energy: boolean | null; notes: boolean | null }>({
    energy: null,
    notes: null,
  });
  const isMountedRef = useRef(true);

  const isWeightValid = Number.isFinite(checkinWeight) && checkinWeight >= 30 && checkinWeight <= 250;
  const isDateValid = Boolean(checkinDate);
  const isTrackingReady = trackingStatus === "ready";
  const isSubmitDisabled = !isTrackingReady || !isWeightValid || !isDateValid || isSubmitting;
  const isEnergyValid = Number.isFinite(energyValue) && energyValue >= 1 && energyValue <= 5;
  const isNotesValid = notesValue.trim().length > 0;

  useEffect(() => {
    localStorage.setItem(CHECKIN_MODE_KEY, checkinMode);
  }, [checkinMode]);

  function detectTrackingSupport(entries?: Array<Record<string, unknown>> | null) {
    if (!entries || entries.length === 0) return { energy: false, notes: false };
    const supportsEnergy = entries.some((entry) => Object.prototype.hasOwnProperty.call(entry, "energy"));
    const supportsNotes = entries.some((entry) => Object.prototype.hasOwnProperty.call(entry, "notes"));
    return { energy: supportsEnergy, notes: supportsNotes };
  }

  async function refreshTrackingData(options?: { showLoading?: boolean; showError?: boolean }) {
    const { showLoading = false, showError = false } = options ?? {};
    if (showLoading) {
      setTrackingStatus("loading");
    }
    try {
      const response = await fetch("/api/tracking", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        console.warn("Tracking load failed", response.status);
        if (showError && isMountedRef.current) {
          setTrackingStatus("error");
        }
        return false;
      }
      const data = (await response.json()) as TrackingPayload;
      if (!isMountedRef.current) return false;
      setCheckins(data.checkins ?? []);
      setFoodLog(data.foodLog ?? []);
      setWorkoutLog(data.workoutLog ?? []);
      setTrackingSupports(detectTrackingSupport(data.checkins as Array<Record<string, unknown>>));
      setTrackingLoaded(true);
      setTrackingStatus("ready");
      return true;
    } catch {
      console.warn("Tracking load failed");
      if (showError && isMountedRef.current) {
        setTrackingStatus("error");
      }
      return false;
    }
  }

  useEffect(() => {
    let active = true;
    const loadTracking = async () => {
      if (!active) return;
      await refreshTrackingData({ showLoading: true, showError: true });
    };

    const loadUserFoods = async () => {
      try {
        const response = await fetch("/api/user-foods", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const data = (await response.json()) as UserFood[];
        if (active) setUserFoods(data);
      } catch {
        // Ignore load errors.
      }
    };

    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (active) {
setProfile(data);

setCheckinWeight(Number(data.weightKg ?? 0));
setCheckinChest(Number(data.measurements.chestCm ?? 0));
setCheckinWaist(Number(data.measurements.waistCm ?? 0));
setCheckinHips(Number(data.measurements.hipsCm ?? 0));
setCheckinBiceps(Number(data.measurements.bicepsCm ?? 0));
setCheckinThigh(Number(data.measurements.thighCm ?? 0));
setCheckinCalf(Number(data.measurements.calfCm ?? 0));
setCheckinNeck(Number(data.measurements.neckCm ?? 0));
setCheckinBodyFat(Number(data.measurements.bodyFatPercent ?? 0));

        }
      } catch {
        // Ignore load errors.
      }
    };

    void loadTracking();
    void loadProfile();
    void loadUserFoods();
    return () => {
      active = false;
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!trackingLoaded) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ checkins, foodLog, workoutLog }),
      }).then((response) => {
        if (!response.ok) {
          console.warn("Tracking save failed", response.status);
        }
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
    if (checkins.length === 0) return t("profile.checkinKeep");
    const latest = [...checkins].sort((a, b) => b.date.localeCompare(a.date))[0];
    const delta = currentWeight - latest.weightKg;
    if (profile.goal === "cut") {
      if (delta >= 0) return t("profile.checkinReduceCalories");
      return t("profile.checkinKeep");
    }

    if (profile.goal === "bulk") {
      if (delta <= 0) return t("profile.checkinIncreaseCalories");
      return t("profile.checkinKeep");
    }

    if (checkinEnergy <= 2 || checkinHunger >= 4) return t("profile.checkinIncreaseProtein");
    return t("profile.checkinKeep");
  }

  async function addCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitDisabled) return;
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
    const saved = await persistCheckin(nextCheckins, {
      weightKg: entry.weightKg,
      chestCm: entry.chestCm,
      waistCm: entry.waistCm,
      hipsCm: entry.hipsCm,
      bicepsCm: entry.bicepsCm,
      thighCm: entry.thighCm,
      calfCm: entry.calfCm,
      neckCm: entry.neckCm,
      bodyFatPercent: entry.bodyFatPercent,
    });
    if (saved) {
      setCheckinNotes("");
      setCheckinFrontPhoto(null);
      setCheckinSidePhoto(null);
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

  const userFoodMap = useMemo(() => new Map(userFoods.map((food) => [food.id, food])), [userFoods]);

  function resolveFoodProfile(key: string) {
    if (key.startsWith("user:")) {
      const id = key.replace("user:", "");
      const food = userFoodMap.get(id);
      if (!food) return null;
      return {
        label: food.name,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        calories: food.calories,
      };
    }
    const profile = defaultFoodProfiles[key];
    if (!profile) return null;
    const calories = profile.protein * 4 + profile.carbs * 4 + profile.fat * 9;
    return { label: t(profile.labelKey), protein: profile.protein, carbs: profile.carbs, fat: profile.fat, calories };
  }

  function showMessage(message: string) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(null), 2000);
  }

  async function persistCheckin(
    nextCheckins: CheckinEntry[],
    metrics: CheckinMetrics,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onError?: (message: string) => void;
      setSubmitting?: (value: boolean) => void;
    }
  ) {
    const successMessage = options?.successMessage ?? t("tracking.weightEntrySuccess");
    const errorMessage = options?.errorMessage ?? t("tracking.weightEntryError");
    const setSubmitting = options?.setSubmitting ?? setIsSubmitting;
    setSubmitting(true);
    if (!options?.onError) {
      setSubmitError(null);
    }
    try {
      const nextProfile = await saveCheckinAndSyncProfileMetrics(
        { checkins: nextCheckins, foodLog, workoutLog },
        profile,
        metrics
      );
      setCheckins(nextCheckins);
      setProfile(nextProfile);
      void refreshTrackingData();
      showMessage(successMessage);
      return true;
    } catch {
      if (options?.onError) {
        options.onError(errorMessage);
      } else {
        setSubmitError(errorMessage);
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEntry(collection: "checkins" | "foodLog" | "workoutLog", id: string) {
    const confirmed = window.confirm(t("tracking.deleteConfirm"));
    if (!confirmed) return;
    const response = await fetch(`/api/tracking/${collection}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      showMessage(t("tracking.deleteError"));
      return;
    }
    if (collection === "checkins") {
      setCheckins((prev) => prev.filter((entry) => entry.id !== id));
    } else if (collection === "foodLog") {
      setFoodLog((prev) => prev.filter((entry) => entry.id !== id));
    } else {
      setWorkoutLog((prev) => prev.filter((entry) => entry.id !== id));
    }
    showMessage(t("tracking.deleteSuccess"));
  }

  function openFoodModal(food?: UserFood) {
    if (food) {
      setFoodForm({
        id: food.id,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        unit: food.unit,
        brand: food.brand ?? "",
      });
    } else {
      setFoodForm({
        id: "",
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unit: "100g",
        brand: "",
      });
    }
    setFoodModalOpen(true);
  }

  async function handleSaveFood(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: foodForm.name.trim(),
      calories: Number(foodForm.calories),
      protein: Number(foodForm.protein),
      carbs: Number(foodForm.carbs),
      fat: Number(foodForm.fat),
      unit: foodForm.unit,
      brand: foodForm.brand.trim() || null,
    };
    if (!payload.name) return;
    const isEditing = Boolean(foodForm.id);
    const response = await fetch(isEditing ? `/api/user-foods/${foodForm.id}` : "/api/user-foods", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      showMessage(t("tracking.foodSaveError"));
      return;
    }
    const data = (await response.json()) as UserFood;
    setUserFoods((prev) => {
      const next = isEditing ? prev.map((item) => (item.id === data.id ? data : item)) : [data, ...prev];
      return next;
    });
    setFoodModalOpen(false);
    showMessage(isEditing ? t("tracking.foodUpdated") : t("tracking.foodCreated"));
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
        const profile = resolveFoodProfile(entry.foodKey);
        if (!profile) return totals;
        const factor = entry.grams / 100;
        totals.protein += profile.protein * factor;
        totals.carbs += profile.carbs * factor;
        totals.fat += profile.fat * factor;
        totals.calories += profile.calories * factor;
        return totals;
      },
      { protein: 0, carbs: 0, fat: 0, calories: 0 }
    );
  }

  const nutritionTargets = profile.nutritionPlan
    ? {
        calories: profile.nutritionPlan.dailyCalories,
        protein: profile.nutritionPlan.proteinG,
        carbs: profile.nutritionPlan.carbsG,
        fat: profile.nutritionPlan.fatG,
      }
    : null;

  function getStatusClass(value: number, target: number) {
    const delta = value - target;
    if (Math.abs(delta) <= 0.5) return "status-exact";
    return delta < 0 ? "status-under" : "status-over";
  }

  function getStatusLabel(value: number, target: number) {
    const delta = value - target;
    if (Math.abs(delta) <= 0.5) return t("tracking.statusExact");
    return delta < 0 ? t("tracking.statusUnder") : t("tracking.statusOver");
  }

  const macroLabels = useMemo(
    () => ({
      protein: t("macros.proteinShort"),
      carbs: t("macros.carbsShort"),
      fat: t("macros.fatShort"),
    }),
    [t]
  );

  function getMacroBadge(label: string, value: number, target?: number | null) {
    if (!target) return null;
    const statusClass = getStatusClass(value, target);
    return (
      <span className={`status-pill is-compact ${statusClass}`} key={label}>
        {label} {value.toFixed(0)}
        {t("units.grams")}
      </span>
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

  const sortedCheckins = useMemo(
    () => [...checkins].sort((a, b) => b.date.localeCompare(a.date)),
    [checkins]
  );
  const latestCheckin = sortedCheckins[0];
  const latestEnergyCheckin = sortedCheckins.find((entry) => Number.isFinite(entry.energy) && entry.energy > 0);
  const latestNotesCheckin = sortedCheckins.find((entry) => entry.notes?.trim());
  const supportsEnergy = trackingSupports.energy === true;
  const supportsNotes = trackingSupports.notes === true;
  const baseWeight = Number(latestCheckin?.weightKg ?? profile.weightKg ?? 0);
  const hasBaseWeight = Number.isFinite(baseWeight) && baseWeight >= 30 && baseWeight <= 250;
  const isEnergySubmitDisabled =
    !supportsEnergy || !isTrackingReady || !isEnergyValid || !energyDate || !hasBaseWeight || isEnergySubmitting;
  const isNotesSubmitDisabled =
    !supportsNotes || !isTrackingReady || !isNotesValid || !notesDate || !hasBaseWeight || isNotesSubmitting;

  async function addQuickWeightEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitDisabled) return;
    const recommendation = buildRecommendation(checkinWeight);
    const entry: CheckinEntry = {
      id: `${checkinDate}-${Date.now()}`,
      date: checkinDate,
      weightKg: Number(checkinWeight),
      chestCm: Number(profile.measurements.chestCm ?? 0),
      waistCm: Number(profile.measurements.waistCm ?? 0),
      hipsCm: Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: Number(profile.measurements.bicepsCm ?? 0),
      thighCm: Number(profile.measurements.thighCm ?? 0),
      calfCm: Number(profile.measurements.calfCm ?? 0),
      neckCm: Number(profile.measurements.neckCm ?? 0),
      bodyFatPercent: Number(profile.measurements.bodyFatPercent ?? 0),
      energy: Number(checkinEnergy),
      hunger: Number(checkinHunger),
      notes: "",
      recommendation,
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    };
    const nextCheckins = [entry, ...checkins].sort((a, b) => b.date.localeCompare(a.date));
    await persistCheckin(nextCheckins, {
      weightKg: entry.weightKg,
      chestCm: entry.chestCm,
      waistCm: entry.waistCm,
      hipsCm: entry.hipsCm,
      bicepsCm: entry.bicepsCm,
      thighCm: entry.thighCm,
      calfCm: entry.calfCm,
      neckCm: entry.neckCm,
      bodyFatPercent: entry.bodyFatPercent,
    });
  }

  async function addEnergyEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isEnergySubmitDisabled) return;
    setEnergySubmitError(null);
    const recommendation = buildRecommendation(baseWeight);
    const entry: CheckinEntry = {
      id: `${energyDate}-${Date.now()}`,
      date: energyDate,
      weightKg: baseWeight,
      chestCm: Number(profile.measurements.chestCm ?? 0),
      waistCm: Number(profile.measurements.waistCm ?? 0),
      hipsCm: Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: Number(profile.measurements.bicepsCm ?? 0),
      thighCm: Number(profile.measurements.thighCm ?? 0),
      calfCm: Number(profile.measurements.calfCm ?? 0),
      neckCm: Number(profile.measurements.neckCm ?? 0),
      bodyFatPercent: Number(profile.measurements.bodyFatPercent ?? 0),
      energy: Number(energyValue),
      hunger: Number(checkinHunger),
      notes: "",
      recommendation,
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    };
    const nextCheckins = [entry, ...checkins].sort((a, b) => b.date.localeCompare(a.date));
    const saved = await persistCheckin(
      nextCheckins,
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
      },
      {
        successMessage: t("tracking.energyEntrySuccess"),
        errorMessage: t("tracking.energyEntryError"),
        onError: setEnergySubmitError,
        setSubmitting: setIsEnergySubmitting,
      }
    );
    if (saved) {
      setEnergyValue(3);
    }
  }

  async function addNotesEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isNotesSubmitDisabled) return;
    const trimmedNotes = notesValue.trim();
    if (!trimmedNotes) return;
    setNotesSubmitError(null);
    const recommendation = buildRecommendation(baseWeight);
    const entry: CheckinEntry = {
      id: `${notesDate}-${Date.now()}`,
      date: notesDate,
      weightKg: baseWeight,
      chestCm: Number(profile.measurements.chestCm ?? 0),
      waistCm: Number(profile.measurements.waistCm ?? 0),
      hipsCm: Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: Number(profile.measurements.bicepsCm ?? 0),
      thighCm: Number(profile.measurements.thighCm ?? 0),
      calfCm: Number(profile.measurements.calfCm ?? 0),
      neckCm: Number(profile.measurements.neckCm ?? 0),
      bodyFatPercent: Number(profile.measurements.bodyFatPercent ?? 0),
      energy: Number(checkinEnergy),
      hunger: Number(checkinHunger),
      notes: trimmedNotes,
      recommendation,
      frontPhotoUrl: null,
      sidePhotoUrl: null,
    };
    const nextCheckins = [entry, ...checkins].sort((a, b) => b.date.localeCompare(a.date));
    const saved = await persistCheckin(
      nextCheckins,
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
      },
      {
        successMessage: t("tracking.notesEntrySuccess"),
        errorMessage: t("tracking.notesEntryError"),
        onError: setNotesSubmitError,
        setSubmitting: setIsNotesSubmitting,
      }
    );
    if (saved) {
      setNotesValue("");
    }
  }

  return (
    <div className="page">
      {actionMessage && (
        <div className="toast" role="status" aria-live="polite">
          {actionMessage}
        </div>
      )}
      <section className="card" id="weight-entry">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("tracking.weightEntryTitle")}</h2>
            <p className="section-subtitle">{t("tracking.weightEntrySubtitle")}</p>
          </div>
        </div>
        <form onSubmit={addQuickWeightEntry} className="form-stack">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {t("profile.checkinDate")}
              <input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} />
            </label>
            <label className="form-stack">
              {t("profile.checkinWeight")}
              <input
                type="number"
                min={30}
                max={250}
                step="0.1"
                value={checkinWeight}
                onChange={(e) => setCheckinWeight(Number(e.target.value))}
              />
            </label>
          </div>
          {!isWeightValid && isTrackingReady ? <p className="muted">{t("tracking.weightEntryInvalid")}</p> : null}
          {submitError ? <p className="muted">{submitError}</p> : null}
          {trackingStatus === "error" ? <p className="muted">{t("tracking.weightEntryUnavailable")}</p> : null}
          <button type="submit" className={`btn ${isSubmitting ? "is-loading" : ""}`} disabled={isSubmitDisabled}>
            {isSubmitting ? (
              <>
                <span className="spinner" aria-hidden="true" /> {t("tracking.weightEntrySaving")}
              </>
            ) : (
              t("tracking.weightEntryCta")
            )}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <div className="feature-card">
            <p className="muted" style={{ marginBottom: 8 }}>
              {t("tracking.latestWeightTitle")}
            </p>
            {trackingStatus === "loading" ? (
              <Skeleton variant="line" style={{ width: "40%" }} />
            ) : trackingStatus === "error" ? (
              <p className="muted">{t("tracking.weightHistoryError")}</p>
            ) : latestCheckin ? (
              <div style={{ display: "grid", gap: 4 }}>
                <strong>
                  {latestCheckin.weightKg} {t("units.kilograms")}
                </strong>
                <span className="muted">{latestCheckin.date}</span>
              </div>
            ) : (
              <p className="muted">{t("tracking.latestWeightEmpty")}</p>
            )}
          </div>

          <div className="feature-card">
            <p className="muted" style={{ marginBottom: 8 }}>
              {t("tracking.weightHistoryTitle")}
            </p>
            {trackingStatus === "loading" ? (
              <div className="tracking-history-skeleton" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`history-skeleton-${index}`} className="tracking-history-skeleton-row">
                    <Skeleton variant="line" className="tracking-history-skeleton-date" />
                    <Skeleton variant="line" className="tracking-history-skeleton-value" />
                  </div>
                ))}
              </div>
            ) : trackingStatus === "error" ? (
              <p className="muted">{t("tracking.weightHistoryError")}</p>
            ) : sortedCheckins.length === 0 ? (
              <p className="muted">{t("tracking.weightHistoryEmpty")}</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {sortedCheckins.map((entry) => (
                  <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span>{entry.date}</span>
                    <span className="muted">
                      {entry.weightKg} {t("units.kilograms")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="card" id="checkin-entry">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("profile.checkinTitle")}</h2>
            <p className="section-subtitle">{t("profile.checkinSubtitle")}</p>
          </div>
        </div>
        <form onSubmit={addCheckin} className="form-stack">
          <div className="segmented-control">
            <button
              type="button"
              className={`btn secondary ${checkinMode === "quick" ? "is-active" : ""}`}
              onClick={() => setCheckinMode("quick")}
            >
              {t("tracking.checkinModeQuick")}
            </button>
            <button
              type="button"
              className={`btn secondary ${checkinMode === "full" ? "is-active" : ""}`}
              onClick={() => setCheckinMode("full")}
            >
              {t("tracking.checkinModeFull")}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 4 }}>
            {checkinMode === "quick" ? t("tracking.checkinModeQuickHint") : t("tracking.checkinModeFullHint")}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {t("profile.checkinDate")}
              <input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} />
            </label>
            <label className="form-stack">
              {t("profile.checkinWeight")}
              <input type="number" min={30} max={250} step="0.1" value={checkinWeight} onChange={(e) => setCheckinWeight(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {t("profile.bodyFat")}
              <input type="number" min={0} max={60} step="0.1" value={checkinBodyFat} onChange={(e) => setCheckinBodyFat(Number(e.target.value))} />
            </label>
            <label className="form-stack">
              {t("tracking.checkinWaistOptional")}
              <input type="number" min={0} value={checkinWaist} onChange={(e) => setCheckinWaist(Number(e.target.value))} />
            </label>
          </div>

          {checkinMode === "full" ? (
            <details className="accordion-card">
              <summary>{t("tracking.checkinAdvancedTitle")}</summary>
              <p className="muted" style={{ marginTop: 8 }}>
                {t("tracking.checkinAdvancedHint")}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label className="form-stack">
                  {t("profile.chest")}
                  <input type="number" min={0} value={checkinChest} onChange={(e) => setCheckinChest(Number(e.target.value))} />
                </label>
                <label className="form-stack">
                  {t("profile.hips")}
                  <input type="number" min={0} value={checkinHips} onChange={(e) => setCheckinHips(Number(e.target.value))} />
                </label>
                <label className="form-stack">
                  {t("profile.biceps")}
                  <input type="number" min={0} value={checkinBiceps} onChange={(e) => setCheckinBiceps(Number(e.target.value))} />
                </label>
                <label className="form-stack">
                  {t("profile.thigh")}
                  <input type="number" min={0} value={checkinThigh} onChange={(e) => setCheckinThigh(Number(e.target.value))} />
                </label>
                <label className="form-stack">
                  {t("profile.calf")}
                  <input type="number" min={0} value={checkinCalf} onChange={(e) => setCheckinCalf(Number(e.target.value))} />
                </label>
                <label className="form-stack">
                  {t("profile.neck")}
                  <input type="number" min={0} value={checkinNeck} onChange={(e) => setCheckinNeck(Number(e.target.value))} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label className="form-stack">
                  {t("profile.checkinEnergy")}
                  <input type="number" min={1} max={5} value={checkinEnergy} onChange={(e) => setCheckinEnergy(Number(e.target.value))} />
                </label>
                <label className="form-stack">
                  {t("profile.checkinHunger")}
                  <input type="number" min={1} max={5} value={checkinHunger} onChange={(e) => setCheckinHunger(Number(e.target.value))} />
                </label>
              </div>

              <label className="form-stack">
                {t("profile.checkinNotes")}
                <textarea value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} rows={3} />
              </label>

              <div className="form-stack">
                <div style={{ fontWeight: 600 }}>{t("profile.checkinPhotos")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <label className="form-stack">
                    {t("profile.checkinFrontPhoto")}
                    <input type="file" accept="image/*" onChange={(e) => handlePhoto(e, setCheckinFrontPhoto)} />
                  </label>
                  <label className="form-stack">
                    {t("profile.checkinSidePhoto")}
                    <input type="file" accept="image/*" onChange={(e) => handlePhoto(e, setCheckinSidePhoto)} />
                  </label>
                </div>
                <span className="muted">{t("profile.checkinPhotoHint")}</span>
              </div>

              <div className="feature-card" style={{ marginTop: 12 }}>
                <strong>{t("tracking.checkinPhotoSoonTitle")}</strong>
                <p className="muted" style={{ marginTop: 6 }}>
                  {t("tracking.checkinPhotoSoonSubtitle")}
                </p>
                <button type="button" className="btn secondary" disabled title={t("tracking.comingSoon")}>
                  {t("tracking.checkinPhotoSoonCta")}
                </button>
              </div>
            </details>
          ) : null}

          <button
            type="submit"
            className={`btn ${isSubmitting ? "is-loading" : ""}`}
            style={{ width: "fit-content" }}
            disabled={isSubmitDisabled}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" aria-hidden="true" /> {t("tracking.weightEntrySaving")}
              </>
            ) : (
              t("profile.checkinAdd")
            )}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {checkins.length === 0 ? (
            <p className="muted">{t("profile.checkinEmpty")}</p>
          ) : (
            checkins.map((entry) => (
              <div key={entry.id} className="feature-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{entry.date}</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>
                      {entry.weightKg} {t("units.kilograms")} · {entry.waistCm} {t("units.centimeters")}
                    </span>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => handleDeleteEntry("checkins", entry.id)}
                    >
                      {t("tracking.delete")}
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 6 }}>
                  {t("profile.checkinRecommendation")}: <strong>{entry.recommendation}</strong>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                  {entry.frontPhotoUrl && (
                    <img
                      src={entry.frontPhotoUrl}
                      alt={t("profile.checkinFrontPhoto")}
                      style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
                    />
                  )}
                  {entry.sidePhotoUrl && (
                    <img
                      src={entry.sidePhotoUrl}
                      alt={t("profile.checkinSidePhoto")}
                      style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
                    />
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
            <h2 className="section-title" style={{ fontSize: 20 }}>{t("tracking.weeklyProgressTitle")}</h2>
            <p className="section-subtitle">{t("tracking.weeklyProgressSubtitle")}</p>
          </div>
        </div>
        {checkinChart.length === 0 ? (
          <p className="muted">{t("tracking.weeklyProgressEmpty")}</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {checkinChart.map((point, index) => (
              <div key={`${point.date}-${index}`} className="info-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{point.date}</strong>
                  <span className="muted">
                    {point.weight} {t("units.kilograms")} · {point.bodyFat}
                    {t("units.percent")}
                  </span>
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
        <h2 className="section-title" style={{ fontSize: 20 }}>{t("tracking.sectionMeals")}</h2>
        <form onSubmit={addFoodEntry} className="form-stack">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {t("tracking.mealDate")}
              <input type="date" value={foodDate} onChange={(e) => setFoodDate(e.target.value)} />
            </label>
            <label className="form-stack">
              {t("tracking.mealFood")}
              <select value={foodKey} onChange={(e) => setFoodKey(e.target.value)}>
                {Object.entries(defaultFoodProfiles).map(([key, profile]) => (
                  <option key={key} value={key}>
                    {t(profile.labelKey)}
                  </option>
                ))}
                {userFoods.length > 0 && (
                  <optgroup label={t("tracking.customFoodsLabel")}>
                    {userFoods.map((food) => (
                      <option key={food.id} value={`user:${food.id}`}>
                        {food.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <label className="form-stack">
              {t("tracking.mealGrams")}
              <input type="number" min={0} value={foodGrams} onChange={(e) => setFoodGrams(Number(e.target.value))} />
            </label>
          </div>
          <button type="submit" className="btn" style={{ width: "fit-content" }}>
            {t("tracking.mealAdd")}
          </button>
          <button type="button" className="btn secondary" style={{ width: "fit-content" }} onClick={() => openFoodModal()}>
            {t("tracking.foodCreate")}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {Object.keys(mealsByDate).length === 0 ? (
            <p className="muted">{t("tracking.mealEmpty")}</p>
          ) : (
            Object.entries(mealsByDate).map(([date, entries]) => {
              const totals = macroTotals(entries);
              return (
                <div key={date} className="feature-card">
                  <strong>{date}</strong>
                  <div className="meal-totals">
                    <div className="meal-totals-header">
                      <span className="muted">{t("tracking.mealTotals")}</span>
                      <div className="meal-totals-calories">
                        <strong>
                          {totals.calories.toFixed(0)} {t("units.kcal")}
                        </strong>
                        {nutritionTargets ? (
                          <span
                            className={`status-pill ${getStatusClass(totals.calories, nutritionTargets.calories)}`}
                          >
                            {getStatusLabel(totals.calories, nutritionTargets.calories)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="meal-totals-macros">
                      <span>
                        {totals.protein.toFixed(1)}
                        {t("units.grams")} {macroLabels.protein}
                      </span>
                      <span>
                        {totals.carbs.toFixed(1)}
                        {t("units.grams")} {macroLabels.carbs}
                      </span>
                      <span>
                        {totals.fat.toFixed(1)}
                        {t("units.grams")} {macroLabels.fat}
                      </span>
                    </div>
                    {nutritionTargets ? (
                      <div className="meal-targets">
                        {getMacroBadge(macroLabels.protein, totals.protein, nutritionTargets.protein)}
                        {getMacroBadge(macroLabels.carbs, totals.carbs, nutritionTargets.carbs)}
                        {getMacroBadge(macroLabels.fat, totals.fat, nutritionTargets.fat)}
                        <span className="muted">
                          {t("tracking.targetLabel")}: {nutritionTargets.calories} {t("units.kcal")}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">{t("tracking.targetsMissing")}</span>
                    )}
                  </div>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {entries.map((entry) => {
                      const profile = resolveFoodProfile(entry.foodKey);
                      if (!profile) return null;
                      const factor = entry.grams / 100;
                      return (
                        <li key={entry.id}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span>
                              {profile.label} {entry.grams}
                              {t("units.grams")} → {(profile.protein * factor).toFixed(1)}
                              {macroLabels.protein} / {(profile.carbs * factor).toFixed(1)}
                              {macroLabels.carbs} / {(profile.fat * factor).toFixed(1)}
                              {macroLabels.fat}
                            </span>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => handleDeleteEntry("foodLog", entry.id)}
                            >
                              {t("tracking.delete")}
                            </button>
                          </div>
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

      {SHOW_WORKOUT_LOG ? (
        <section className="card">
          <h2 className="section-title" style={{ fontSize: 20 }}>{t("tracking.sectionWorkouts")}</h2>
          <form onSubmit={addWorkoutEntry} className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label className="form-stack">
                {t("tracking.workoutDate")}
                <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} />
              </label>
              <label className="form-stack">
                {t("tracking.workoutName")}
                <input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
              </label>
              <label className="form-stack">
                {t("tracking.workoutDuration")}
                <input
                  type="number"
                  min={0}
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="form-stack">
              {t("tracking.workoutNotes")}
              <textarea value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} rows={2} />
            </label>
            <button type="submit" className="btn" style={{ width: "fit-content" }}>
              {t("tracking.workoutAdd")}
            </button>
          </form>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {workoutLog.length === 0 ? (
              <p className="muted">{t("tracking.workoutEmpty")}</p>
            ) : (
              workoutLog.map((entry) => (
                <div key={entry.id} className="feature-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span>
                      <strong>{entry.date}</strong> — {entry.name} ({entry.durationMin} min)
                    </span>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => handleDeleteEntry("workoutLog", entry.id)}
                    >
                      {t("tracking.delete")}
                    </button>
                  </div>
                  {entry.notes && <p style={{ marginTop: 6 }} className="muted">{entry.notes}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {foodModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setFoodModalOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={foodForm.id ? t("tracking.foodEditTitle") : t("tracking.foodCreateTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <form className="form-stack" onSubmit={handleSaveFood}>
              <h3 style={{ margin: 0 }}>
                {foodForm.id ? t("tracking.foodEditTitle") : t("tracking.foodCreateTitle")}
              </h3>
              <label className="form-stack">
                {t("tracking.foodName")}
                <input
                  value={foodForm.name}
                  onChange={(e) => setFoodForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label className="form-stack">
                {t("tracking.foodBrand")}
                <input
                  value={foodForm.brand}
                  onChange={(e) => setFoodForm((prev) => ({ ...prev, brand: e.target.value }))}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                <label className="form-stack">
                  {t("tracking.foodCalories")}
                  <input
                    type="number"
                    min={0}
                    value={foodForm.calories}
                    onChange={(e) => setFoodForm((prev) => ({ ...prev, calories: Number(e.target.value) }))}
                  />
                </label>
                <label className="form-stack">
                  {t("tracking.foodProtein")}
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={foodForm.protein}
                    onChange={(e) => setFoodForm((prev) => ({ ...prev, protein: Number(e.target.value) }))}
                  />
                </label>
                <label className="form-stack">
                  {t("tracking.foodCarbs")}
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={foodForm.carbs}
                    onChange={(e) => setFoodForm((prev) => ({ ...prev, carbs: Number(e.target.value) }))}
                  />
                </label>
                <label className="form-stack">
                  {t("tracking.foodFat")}
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={foodForm.fat}
                    onChange={(e) => setFoodForm((prev) => ({ ...prev, fat: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <label className="form-stack">
                {t("tracking.foodUnit")}
                <select
                  value={foodForm.unit}
                  onChange={(e) => setFoodForm((prev) => ({ ...prev, unit: e.target.value as UserFood["unit"] }))}
                >
                  <option value="100g">{t("tracking.unit100g")}</option>
                  <option value="serving">{t("tracking.unitServing")}</option>
                  <option value="unit">{t("tracking.unitUnit")}</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" className="btn">
                  {t("tracking.save")}
                </button>
                <button type="button" className="btn secondary" onClick={() => setFoodModalOpen(false)}>
                  {t("tracking.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
