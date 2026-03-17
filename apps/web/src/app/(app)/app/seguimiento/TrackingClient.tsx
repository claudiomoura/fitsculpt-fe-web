"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { trackEvent } from "@/lib/analytics";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { getUserProfile, saveCheckinAndSyncProfileMetrics } from "@/lib/profileService";
import {
  hasAiEntitlement,
  requestAiTrainingPlan,
  saveAiTrainingPlan,
  type AiEntitlementProfile,
} from "@/domains/ai";
import {
  canApplyTrainingAdjustment,
  generateAndSaveTrainingPlan,
  getTrainingAdjustmentInput,
  hasTrainingPlanAdjustmentCapability,
} from "@/domains/training";
import { Skeleton } from "@/design-system/components/Skeleton";
import { defaultFoodProfiles } from "@/lib/foodProfiles";
import TrainingAdjustmentDiffSummary, {
  buildTrainingAdjustmentDiff,
  type TrainingAdjustmentDiff,
} from "@/components/tracking/TrainingAdjustmentDiffSummary";
import styles from "./TrackingClient.module.css";

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

type MealLogEntry = {
  id: string;
  date: string;
  mealKey: string;
  mealType: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  completedAt: string;
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

type TrackingPayload = {
  checkins: CheckinEntry[];
  foodLog: FoodEntry[];
  workoutLog: WorkoutEntry[];
  mealLog: MealLogEntry[];
};

type TrackingClientProps = {
  view?: "all" | "checkin";
};

type ProgressInsightTab = "checkin" | "nutrition" | "training";

export default function TrackingClient({ view = "all" }: TrackingClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const isCheckinOnly = view === "checkin";
  const CHECKIN_MODE_KEY = "fs_checkin_mode_v1";
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
  const [progressRange, setProgressRange] = useState<"7" | "30" | "90">("30");
  const [progressInsightTab, setProgressInsightTab] = useState<ProgressInsightTab>("checkin");
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
  const [mealLog, setMealLog] = useState<MealLogEntry[]>([]);
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
  const [adjustmentStatus, setAdjustmentStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [adjustmentSuccess, setAdjustmentSuccess] = useState<{ at: string; period?: string } | null>(null);
  const [adjustmentDiff, setAdjustmentDiff] = useState<TrainingAdjustmentDiff | null>(null);
  const [adjustmentCapabilityChecked, setAdjustmentCapabilityChecked] = useState(false);
  const [hasAdjustmentCapability, setHasAdjustmentCapability] = useState(false);
  const [adjustmentEntitlementChecked, setAdjustmentEntitlementChecked] = useState(false);
  const [hasAdjustmentEntitlement, setHasAdjustmentEntitlement] = useState(false);
  const [adjustmentTokenBalance, setAdjustmentTokenBalance] = useState<number | null>(null);
  const [trackingSupports, setTrackingSupports] = useState<{
    energy: boolean | null;
    notes: boolean | null;
    bodyFat: boolean | null;
    waist: boolean | null;
    measurements: boolean | null;
  }>({
    energy: null,
    notes: null,
    bodyFat: null,
    waist: null,
    measurements: null,
  });
  const supportsCheckinPhotos = false;
  const isMountedRef = useRef(true);

  const isWeightValid = Number.isFinite(checkinWeight) && checkinWeight >= 30 && checkinWeight <= 250;
  const isDateValid = Boolean(checkinDate);
  const isTrackingReady = trackingStatus === "ready";
  const isEnergyValid = Number.isFinite(energyValue) && energyValue >= 1 && energyValue <= 5;
  const isNotesValid = notesValue.trim().length > 0;
  const supportsBodyFat = trackingSupports.bodyFat === true;
  const supportsWaist = trackingSupports.waist === true;
  const supportsMeasurements = trackingSupports.measurements === true;
  const supportsEnergy = trackingSupports.energy === true;
  const supportsNotes = trackingSupports.notes === true;
  const isBodyFatValid =
    !supportsBodyFat || (Number.isFinite(checkinBodyFat) && checkinBodyFat >= 0 && checkinBodyFat <= 60);
  const isWaistValid = !supportsWaist || (Number.isFinite(checkinWaist) && checkinWaist >= 0);
  const isWeightEntrySubmitDisabled = !isWeightValid || !isDateValid || isSubmitting;
  const isCheckinSubmitDisabled =
    !isWeightValid || !isDateValid || !isBodyFatValid || !isWaistValid || isSubmitting;
  const adjustmentInput = canApplyTrainingAdjustment(profile) ? getTrainingAdjustmentInput(profile) : null;
  const hasAdjustmentTokens = hasAdjustmentEntitlement || (adjustmentTokenBalance ?? 0) > 0;
  const canApplyAdjustment =
    adjustmentCapabilityChecked &&
    adjustmentEntitlementChecked &&
    hasAdjustmentCapability &&
    hasAdjustmentEntitlement &&
    hasAdjustmentTokens &&
    Boolean(adjustmentInput);
  const isApplyAdjustmentDisabled = adjustmentStatus === "loading" || !canApplyAdjustment;

  useEffect(() => {
    localStorage.setItem(CHECKIN_MODE_KEY, checkinMode);
  }, [checkinMode]);

  useEffect(() => {
    let active = true;
    const detectCapability = async () => {
      const hasCapability = await hasTrainingPlanAdjustmentCapability();
      if (!active) return;
      setHasAdjustmentCapability(hasCapability);
      setAdjustmentCapabilityChecked(true);
    };
    void detectCapability();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadEntitlement = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as AiEntitlementProfile & {
          aiTokenBalance?: number;
        };
        if (!active) return;
        setHasAdjustmentEntitlement(hasAiEntitlement(data));
        setAdjustmentTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      } catch (_err) {
        if (!active) return;
        setHasAdjustmentEntitlement(false);
        setAdjustmentTokenBalance(null);
      } finally {
        if (active) setAdjustmentEntitlementChecked(true);
      }
    };
    void loadEntitlement();
    return () => {
      active = false;
    };
  }, []);

  function detectTrackingSupport(entries?: Array<Record<string, unknown>> | null) {
    if (!entries || entries.length === 0) {
      return { energy: false, notes: false, bodyFat: false, waist: false, measurements: false };
    }
    const hasField = (field: string) =>
      entries.some((entry) => Object.prototype.hasOwnProperty.call(entry, field));
    const measurementFields = ["chestCm", "hipsCm", "bicepsCm", "thighCm", "calfCm", "neckCm"];
    const supportsEnergy = hasField("energy");
    const supportsNotes = hasField("notes");
    const supportsBodyFat = hasField("bodyFatPercent");
    const supportsWaist = hasField("waistCm");
    const supportsMeasurements = measurementFields.some((field) => hasField(field));
    return {
      energy: supportsEnergy,
      notes: supportsNotes,
      bodyFat: supportsBodyFat,
      waist: supportsWaist,
      measurements: supportsMeasurements,
    };
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
      setMealLog(data.mealLog ?? []);
      setTrackingSupports(detectTrackingSupport(data.checkins as Array<Record<string, unknown>>));
      setTrackingLoaded(true);
      setTrackingStatus("ready");
      return true;
    } catch (_err) {
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
      } catch (_err) {
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
      } catch (_err) {
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
        body: JSON.stringify({ checkins, foodLog, workoutLog, mealLog }),
      }).then((response) => {
        if (!response.ok) {
          console.warn("Tracking save failed", response.status);
        }
      });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [checkins, foodLog, workoutLog, mealLog, trackingLoaded]);

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
    if (isCheckinSubmitDisabled) return;
    const recommendation = buildRecommendation(checkinWeight);
    const useAdvancedMetrics = checkinMode === "full" && supportsMeasurements;
    const resolvedMeasurements = {
      chestCm: useAdvancedMetrics ? Number(checkinChest) : Number(profile.measurements.chestCm ?? 0),
      hipsCm: useAdvancedMetrics ? Number(checkinHips) : Number(profile.measurements.hipsCm ?? 0),
      bicepsCm: useAdvancedMetrics ? Number(checkinBiceps) : Number(profile.measurements.bicepsCm ?? 0),
      thighCm: useAdvancedMetrics ? Number(checkinThigh) : Number(profile.measurements.thighCm ?? 0),
      calfCm: useAdvancedMetrics ? Number(checkinCalf) : Number(profile.measurements.calfCm ?? 0),
      neckCm: useAdvancedMetrics ? Number(checkinNeck) : Number(profile.measurements.neckCm ?? 0),
    };
    const resolvedWaist = supportsWaist ? Number(checkinWaist) : Number(profile.measurements.waistCm ?? 0);
    const resolvedBodyFat = supportsBodyFat
      ? Number(checkinBodyFat)
      : Number(profile.measurements.bodyFatPercent ?? 0);
    const resolvedEnergy = supportsEnergy ? Number(checkinEnergy) : Number(latestCheckin?.energy ?? 0);
    const resolvedHunger = supportsEnergy ? Number(checkinHunger) : Number(latestCheckin?.hunger ?? 0);
    const resolvedNotes = supportsNotes ? checkinNotes.trim() : "";
    const entry: CheckinEntry = {
      id: `${checkinDate}-${Date.now()}`,
      date: checkinDate,
      weightKg: Number(checkinWeight),
      chestCm: resolvedMeasurements.chestCm,
      waistCm: resolvedWaist,
      hipsCm: resolvedMeasurements.hipsCm,
      bicepsCm: resolvedMeasurements.bicepsCm,
      thighCm: resolvedMeasurements.thighCm,
      calfCm: resolvedMeasurements.calfCm,
      neckCm: resolvedMeasurements.neckCm,
      bodyFatPercent: resolvedBodyFat,
      energy: resolvedEnergy,
      hunger: resolvedHunger,
      notes: resolvedNotes,
      recommendation,
      frontPhotoUrl: null,
      sidePhotoUrl: null,
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
        { checkins: nextCheckins, foodLog, workoutLog, mealLog },
        profile,
        metrics
      );
      setProfile(nextProfile);
      const refreshed = await refreshTrackingData({ showLoading: true, showError: true });
      if (!refreshed) {
        if (options?.onError) {
          options.onError(errorMessage);
        } else {
          setSubmitError(errorMessage);
        }
        return false;
      }
      showMessage(successMessage);
      trackEvent("checkin_saved", { target: "checkin", origin: isCheckinOnly ? "checkin_page" : "tracking", mode: checkinMode });
      if (isCheckinOnly) {
        router.push("/app/today?checkin=success");
      }
      return true;
    } catch (_err) {
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
    return mealLog.reduce<Record<string, MealLogEntry[]>>((acc, entry) => {
      acc[entry.date] = acc[entry.date] ? [...acc[entry.date], entry] : [entry];
      return acc;
    }, {});
  }, [mealLog]);

  function macroTotals(entries: MealLogEntry[]) {
    return entries.reduce(
      (totals, entry) => ({
        protein: totals.protein + Number(entry.protein ?? 0),
        carbs: totals.carbs + Number(entry.carbs ?? 0),
        fat: totals.fat + Number(entry.fats ?? 0),
        calories: totals.calories + Number(entry.calories ?? 0),
      }),
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

  const checkinsInRange = useMemo(() => {
    if (checkins.length === 0) return [];
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (Number(progressRange) - 1));
    return checkins.filter((entry) => {
      const parsed = new Date(entry.date);
      return parsed >= startDate && parsed <= endDate;
    });
  }, [checkins, progressRange]);

  const checkinChart = useMemo(() => {
    if (checkinsInRange.length === 0) return [];
    const sorted = [...checkinsInRange]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((entry) => Number.isFinite(entry.weightKg));
    if (sorted.length === 0) return [];
    const weights = sorted.map((entry) => entry.weightKg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = Math.max(1, max - min);
    return sorted.map((entry) => ({
      date: entry.date,
      weight: entry.weightKg,
      bodyFat: supportsBodyFat ? entry.bodyFatPercent : null,
      percent: ((entry.weightKg - min) / range) * 100,
    }));
  }, [checkinsInRange, supportsBodyFat]);

  const sortedCheckins = useMemo(
    () => [...checkins].sort((a, b) => b.date.localeCompare(a.date)),
    [checkins]
  );
  const latestCheckin = sortedCheckins[0];
  const rangeFirstCheckin = checkinChart[0] ?? null;
  const rangeLastCheckin = checkinChart[checkinChart.length - 1] ?? null;
  const rangeWeightDelta =
    rangeFirstCheckin && rangeLastCheckin ? rangeLastCheckin.weight - rangeFirstCheckin.weight : null;
  const adherenceLast7Days = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const uniqueDays = new Set(
      checkins
        .filter((entry) => {
          const parsed = new Date(entry.date);
          return parsed >= cutoff;
        })
        .map((entry) => entry.date)
    );
    return Math.min(100, Math.round((uniqueDays.size / 7) * 100));
  }, [checkins]);
  const latestEnergyCheckin = sortedCheckins.find((entry) => Number.isFinite(entry.energy) && entry.energy > 0);
  const latestNotesCheckin = sortedCheckins.find((entry) => entry.notes?.trim());
  const baseWeight = Number(latestCheckin?.weightKg ?? profile.weightKg ?? 0);
  const hasBaseWeight = Number.isFinite(baseWeight) && baseWeight >= 30 && baseWeight <= 250;
  const isEnergySubmitDisabled =
    !supportsEnergy || !isTrackingReady || !isEnergyValid || !energyDate || !hasBaseWeight || isEnergySubmitting;
  const isNotesSubmitDisabled =
    !supportsNotes || !isTrackingReady || !isNotesValid || !notesDate || !hasBaseWeight || isNotesSubmitting;
  const isTrackingLoading = trackingStatus === "loading";
  const isTrackingError = trackingStatus === "error";
  const rangeDays = Number(progressRange);
  const daysBackForRange = Math.max(0, rangeDays - 1);

  const formatEntryDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  const nutritionDateTotals = Object.entries(mealsByDate)
    .map(([date, entries]) => ({ date, totals: macroTotals(entries) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const nutritionInRange = nutritionDateTotals.filter((entry) => {
    const parsed = new Date(entry.date);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - daysBackForRange);
    return parsed >= cutoff;
  });
  const nutritionDaysLogged = nutritionInRange.length;
  const nutritionTotals = nutritionInRange.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.totals.calories,
      protein: acc.protein + entry.totals.protein,
      carbs: acc.carbs + entry.totals.carbs,
      fat: acc.fat + entry.totals.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const nutritionAverages = nutritionDaysLogged > 0
    ? {
        calories: nutritionTotals.calories / nutritionDaysLogged,
        protein: nutritionTotals.protein / nutritionDaysLogged,
      }
    : { calories: 0, protein: 0 };
  const nutritionLoggingAdherence = Math.round((nutritionDaysLogged / Math.max(1, rangeDays)) * 100);
  const nutritionCaloriesTargetAdherence = nutritionTargets && nutritionDaysLogged > 0
    ? Math.round(
        (nutritionInRange.filter(
          (entry) =>
            entry.totals.calories >= nutritionTargets.calories * 0.9
            && entry.totals.calories <= nutritionTargets.calories * 1.1
        ).length / nutritionDaysLogged)
          * 100
      )
    : null;
  const nutritionProteinTargetAdherence = nutritionTargets && nutritionDaysLogged > 0
    ? Math.round(
        (nutritionInRange.filter((entry) => entry.totals.protein >= nutritionTargets.protein * 0.9).length / nutritionDaysLogged)
          * 100
      )
    : null;

  const workoutsSorted = [...workoutLog].sort((a, b) => b.date.localeCompare(a.date));
  const workoutsInRange = workoutsSorted.filter((entry) => {
    const parsed = new Date(entry.date);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - daysBackForRange);
    return parsed >= cutoff;
  });
  const trainingSessions = workoutsInRange.length;
  const trainingMinutes = workoutsInRange.reduce((sum, entry) => sum + entry.durationMin, 0);
  const trainingAverageMinutes = trainingSessions > 0 ? Math.round(trainingMinutes / trainingSessions) : 0;
  const targetSessions = Math.max(1, Number(profile.trainingPreferences.daysPerWeek ?? 3));
  const trainingConsistency = Math.min(100, Math.round((trainingSessions / targetSessions) * 100));
  const workoutsRecent = workoutsSorted.slice(0, 5);

  async function addQuickWeightEntry(e: React.FormEvent) {
    e.preventDefault();
    if (isWeightEntrySubmitDisabled) return;
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

  const formatLocalDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
  };

  const translateWithDate = (key: string, date: string) => t(key).replace("{date}", date);

  const resolvePeriodText = (metadata: { effectiveFrom?: string; weekStart?: string }) => {
    const source = metadata.effectiveFrom ?? metadata.weekStart;
    if (!source) return undefined;
    const formatted = formatLocalDate(source);
    return formatted ? translateWithDate("tracking.adjustmentPeriod", formatted) : undefined;
  };

  async function handleApplyAdjustment() {
    if (!canApplyAdjustment || !adjustmentInput || adjustmentStatus === "loading") return;
    setAdjustmentStatus("loading");
    setAdjustmentError(null);
    setAdjustmentSuccess(null);
    setAdjustmentDiff(null);
    try {
      const previousPlan = profile.trainingPlan;
      const result = await generateAndSaveTrainingPlan(profile, adjustmentInput);
      const refreshedTracking = await refreshTrackingData({ showLoading: true, showError: true });
      const refreshedProfile = await getUserProfile();
      if (!refreshedTracking) {
        setAdjustmentStatus("error");
        setAdjustmentError(t("tracking.adjustmentRefreshError"));
        return;
      }
      setProfile(refreshedProfile);
      const successDate =
        formatLocalDate(result.metadata.updatedAt ?? new Date().toISOString()) ??
        formatLocalDate(new Date().toISOString()) ??
        new Date().toLocaleDateString();
      setAdjustmentSuccess({
        at: successDate,
        period: resolvePeriodText(result.metadata),
      });
      setAdjustmentDiff(buildTrainingAdjustmentDiff(previousPlan, result.profile.trainingPlan));
      setAdjustmentStatus("success");
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_TOKENS") {
        setAdjustmentError(t("ai.insufficientTokens"));
      } else {
        setAdjustmentError(t("tracking.adjustmentError"));
      }
      setAdjustmentStatus("error");
    }
  }

  return (
    <div className={isCheckinOnly ? "tracking-checkin-only-body premium-page-shell premium-page-shell--compact" : "page page-with-tabbar-safe-area premium-page-shell premium-page-shell--compact"} data-testid="tracking-page">
      {actionMessage && (
        <div className="toast" role="status" aria-live="polite">
          {actionMessage}
        </div>
      )}
      {!isCheckinOnly ? (
        <section className={`card ${styles.heroCard}`}>
          <div className={styles.heroHeader}>
            <div>
              <h2 className="section-title" style={{ fontSize: 24 }}>{t("app.trackingTitle")}</h2>
              <p className="section-subtitle">{t("app.trackingSubtitle")}</p>
            </div>
            <div className="inline-actions-sm">
              <button type="button" className="btn" onClick={() => router.push("/app/progress/check-in")}>
                Nuevo check-in
              </button>
              <a className="btn secondary" href="/app/weekly-review">
                Ver review semanal
              </a>
            </div>
          </div>
          <div className={styles.segmentedControl} role="tablist" aria-label="Rango">
            {[
              { value: "7", label: "Semana" },
              { value: "30", label: "Mes" },
              { value: "90", label: "3 meses" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={progressRange === option.value}
                className={`${styles.segmentedButton} ${progressRange === option.value ? styles.segmentedButtonActive : ""}`}
                onClick={() => setProgressRange(option.value as "7" | "30" | "90")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!isCheckinOnly ? (
        <section className="card">
          <div className={styles.insightTabs} role="tablist" aria-label={t("tracking.insightsLabel")}>
            <p className="muted m-0 w-full text-sm">Analiza progreso por área. La captura principal vive en check-in.</p>
            {([
              { id: "checkin", label: t("tracking.progressTabCheckin") },
              { id: "nutrition", label: t("tracking.progressTabNutrition") },
              { id: "training", label: t("tracking.progressTabTraining") },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={progressInsightTab === tab.id}
                className={`${styles.insightTabButton} ${progressInsightTab === tab.id ? styles.insightTabButtonActive : ""}`}
                onClick={() => setProgressInsightTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {progressInsightTab === "checkin" ? (
            <div className={styles.overviewGrid}>
              <div className={styles.leftColumn}>
                <section className="feature-card">
                  <h2 className="section-title section-title-sm">{t("tracking.weeklyProgressTitle")}</h2>
                  {checkinChart.length === 0 ? (
                    <p className="muted">{t("tracking.weeklyProgressEmpty")}</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {checkinChart.map((point, index) => (
                        <div key={`${point.date}-${index}`} className="info-item">
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <strong>{formatEntryDate(point.date)}</strong>
                            <span className="muted">{point.weight.toFixed(1)} {t("units.kilograms")}</span>
                          </div>
                          <div className="tracking-weekly-progress-bar-track">
                            <div className="tracking-weekly-progress-bar-value" style={{ width: `${point.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className={styles.metricCards}>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.latestWeightTitle")}</p>
                    <strong>{latestCheckin ? `${latestCheckin.weightKg.toFixed(1)} ${t("units.kilograms")}` : "—"}</strong>
                  </article>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.weightHistoryTitle")}</p>
                    <strong>{rangeWeightDelta === null ? "—" : `${rangeWeightDelta > 0 ? "+" : ""}${rangeWeightDelta.toFixed(1)} ${t("units.kilograms")}`}</strong>
                  </article>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.progressConsistency")}</p>
                    <strong>{adherenceLast7Days}%</strong>
                  </article>
                </section>
              </div>
              <aside className={styles.rightColumn}>
                {latestCheckin ? (
                  <section className="feature-card">
                    <h3 className="section-title section-title-sm">{t("tracking.latestWeightTitle")}</h3>
                    <p className="muted">{t("tracking.latestMetricsHint")}</p>
                    <strong>{`${latestCheckin.weightKg.toFixed(1)} ${t("units.kilograms")}`}</strong>
                    <span className="muted">{latestCheckin.date}</span>
                  </section>
                ) : null}
                {supportsBodyFat && latestCheckin ? (
                  <section className="feature-card">
                    <h3 className="section-title section-title-sm">{t("tracking.bodyFatPercent")}</h3>
                    <strong>{latestCheckin.bodyFatPercent.toFixed(1)}{t("units.percent")}</strong>
                  </section>
                ) : null}
                {latestNotesCheckin ? (
                  <section className="feature-card">
                    <h3 className="section-title section-title-sm">{t("tracking.latestNotesTitle")}</h3>
                    <p className="muted">{latestNotesCheckin.notes}</p>
                  </section>
                ) : null}
              </aside>
            </div>
          ) : null}

          {progressInsightTab === "nutrition" ? (
            <div className={styles.overviewGrid}>
              <div className={styles.leftColumn}>
                <section className={styles.metricCards}>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.progressDaysLogged")}</p>
                    <strong>{nutritionDaysLogged}/{rangeDays}</strong>
                  </article>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.progressAverageCalories")}</p>
                    <strong>{nutritionDaysLogged > 0 ? `${nutritionAverages.calories.toFixed(0)} ${t("units.kcal")}` : "—"}</strong>
                  </article>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.progressAverageProtein")}</p>
                    <strong>{nutritionDaysLogged > 0 ? `${nutritionAverages.protein.toFixed(0)} ${t("units.grams")}` : "—"}</strong>
                  </article>
                </section>

                {nutritionDaysLogged === 0 ? (
                  <p className="muted">{t("tracking.mealEmpty")}</p>
                ) : (
                  <section className="feature-card">
                    <h3 className="section-title section-title-sm">{t("tracking.progressComplianceTitle")}</h3>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span className="muted">{t("tracking.progressLoggingLabel")}</span>
                          <strong>{nutritionLoggingAdherence}%</strong>
                        </div>
                        <div className="tracking-weekly-progress-bar-track">
                          <div className="tracking-weekly-progress-bar-value" style={{ width: `${nutritionLoggingAdherence}%` }} />
                        </div>
                      </div>
                      {nutritionCaloriesTargetAdherence !== null ? (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span className="muted">{t("tracking.progressCaloriesTargetLabel")}</span>
                            <strong>{nutritionCaloriesTargetAdherence}%</strong>
                          </div>
                          <div className="tracking-weekly-progress-bar-track">
                            <div className="tracking-weekly-progress-bar-value" style={{ width: `${nutritionCaloriesTargetAdherence}%` }} />
                          </div>
                        </div>
                      ) : null}
                      {nutritionProteinTargetAdherence !== null ? (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span className="muted">{t("tracking.progressProteinTargetLabel")}</span>
                            <strong>{nutritionProteinTargetAdherence}%</strong>
                          </div>
                          <div className="tracking-weekly-progress-bar-track">
                            <div className="tracking-weekly-progress-bar-value" style={{ width: `${nutritionProteinTargetAdherence}%` }} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>
                )}
              </div>
              <aside className={styles.rightColumn}>
                <section className="feature-card">
                  <h3 className="section-title section-title-sm">{t("tracking.progressRecentMeals")}</h3>
                  {nutritionInRange.length === 0 ? (
                    <p className="muted">{t("tracking.mealEmpty")}</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {nutritionInRange.slice(-5).reverse().map((entry) => (
                        <div key={entry.date} className="info-item">
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <strong>{formatEntryDate(entry.date)}</strong>
                            <span className="muted">{entry.totals.calories.toFixed(0)} {t("units.kcal")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          ) : null}

          {progressInsightTab === "training" ? (
            <div className={styles.overviewGrid}>
              <div className={styles.leftColumn}>
                <section className={styles.metricCards}>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.progressSessions")}</p>
                    <strong>{trainingSessions}</strong>
                  </article>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.progressTrainingTime")}</p>
                    <strong>{trainingMinutes} min</strong>
                  </article>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.workoutDuration")}</p>
                    <strong>{trainingAverageMinutes > 0 ? `${trainingAverageMinutes} min` : "—"}</strong>
                  </article>
                  <article className="feature-card">
                    <p className="muted">{t("tracking.progressConsistency")}</p>
                    <strong>{trainingConsistency}%</strong>
                  </article>
                </section>
                <section className="feature-card">
                  <h3 className="section-title section-title-sm">{t("tracking.progressSessionTarget")}</h3>
                  <p className="muted">{targetSessions} {t("tracking.progressPerWeek")}</p>
                  <div className="tracking-weekly-progress-bar-track">
                    <div className="tracking-weekly-progress-bar-value" style={{ width: `${trainingConsistency}%` }} />
                  </div>
                </section>
              </div>
              <aside className={styles.rightColumn}>
                <section className="feature-card">
                  <h3 className="section-title section-title-sm">{t("tracking.progressRecentWorkouts")}</h3>
                  {workoutsRecent.length === 0 ? (
                    <p className="muted">{t("tracking.workoutEmpty")}</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {workoutsRecent.map((entry) => (
                        <div key={entry.id} className="info-item">
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <strong>{entry.name}</strong>
                            <span className="muted">{entry.durationMin} min</span>
                          </div>
                          <span className="muted">{formatEntryDate(entry.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          ) : null}
        </section>
      ) : null}

      {!isCheckinOnly ? (
        <section className="card premium-fade-up">
          <div className="section-head">
            <div>
              <h2 className="section-title" style={{ fontSize: 20 }}>{t("latestMetricsTitle")}</h2>
              <p className="section-subtitle">Solo mostramos datos reales ya guardados en tracking.</p>
            </div>
          </div>

          <div className={styles.metricCards}>
            <article className="feature-card">
              <p className="muted">{t("tracking.latestWeightTitle")}</p>
              <strong>{latestCheckin ? `${latestCheckin.weightKg.toFixed(1)} ${t("units.kilograms")}` : t("tracking.latestWeightEmpty")}</strong>
              {latestCheckin ? <span className="muted">{latestCheckin.date}</span> : null}
            </article>
            <article className="feature-card">
              <p className="muted">{t("tracking.latestEnergyTitle")}</p>
              <strong>{latestEnergyCheckin ? String(latestEnergyCheckin.energy) : t("tracking.latestEnergyEmpty")}</strong>
            </article>
            <article className="feature-card">
              <p className="muted">{t("tracking.latestNotesTitle")}</p>
              <strong>{latestNotesCheckin ? latestNotesCheckin.notes : t("tracking.latestNotesEmpty")}</strong>
            </article>
          </div>

          <div className="inline-actions-sm mt-16">
            <button type="button" className="btn" onClick={() => router.push("/app/progress/check-in")}>
              {t("profile.checkinAdd")}
            </button>
            <Link className="btn secondary" href="/app/nutrition">
              {t("tracking.progressTabNutrition")}
            </Link>
            <Link className="btn secondary" href="/app/training">
              {t("tracking.progressTabTraining")}
            </Link>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {checkins.length === 0 ? (
              <div className="empty-state">
                <p className="muted">{t("profile.checkinEmpty")}</p>
              </div>
            ) : (
              sortedCheckins.slice(0, 5).map((entry) => (
                <div key={entry.id} className="feature-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{entry.date}</strong>
                    <span>
                      {[
                        `${entry.weightKg} ${t("units.kilograms")}`,
                        supportsWaist ? `${entry.waistCm} ${t("units.centimeters")}` : null,
                        supportsBodyFat ? `${entry.bodyFatPercent}${t("units.percent")}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {entry.notes ? <p style={{ marginTop: 6 }} className="muted">{entry.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {isCheckinOnly ? (
        <section className={`card ${styles.checkinShell} premium-fade-up`} id="checkin-entry">
          <div className={styles.checkinHero}>
            <div className="inline-actions-sm w-full justify-end">
              <button type="button" className="btn secondary fit-content" onClick={() => router.back()}>Cerrar</button>
            </div>
            <div>
              <h2 className="section-title" style={{ fontSize: 22 }}>{t("profile.checkinTitle")}</h2>
              <p className="section-subtitle">{t("profile.checkinSubtitle")}</p>
            </div>
            {latestCheckin ? (
              <div className={styles.checkinLatestPill}>
                <span className="muted">{t("tracking.latestWeightTitle")}</span>
                <strong>{latestCheckin.weightKg.toFixed(1)} {t("units.kilograms")}</strong>
              </div>
            ) : null}
          </div>

          <div className={styles.checkinModeGrid}>
            <button
              type="button"
              className={`${styles.checkinModeCard} ${checkinMode === "quick" ? styles.checkinModeCardActive : ""}`}
              onClick={() => setCheckinMode("quick")}
              aria-pressed={checkinMode === "quick"}
            >
              <strong>Registrar peso rapido</strong>
              <span className="muted">Solo fecha y peso del dia.</span>
            </button>
            <button
              type="button"
              className={`${styles.checkinModeCard} ${checkinMode === "full" ? styles.checkinModeCardActive : ""}`}
              onClick={() => setCheckinMode("full")}
              aria-pressed={checkinMode === "full"}
            >
              <strong>Registrar metricas completas</strong>
              <span className="muted">Todas las metricas reales del check-in.</span>
            </button>
          </div>

          <form onSubmit={checkinMode === "quick" ? addQuickWeightEntry : addCheckin} className="form-stack">
            <div className={styles.checkinFormGrid}>
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
                  aria-invalid={!isWeightValid && isTrackingReady}
                />
              </label>
              {checkinMode === "full" ? (
                <>
                  <label className="form-stack">
                    {t("profile.bodyFat")}
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step="0.1"
                      value={checkinBodyFat}
                      onChange={(e) => setCheckinBodyFat(Number(e.target.value))}
                      aria-invalid={!isBodyFatValid && isTrackingReady}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.checkinWaistOptional")}
                    <input
                      type="number"
                      min={0}
                      value={checkinWaist}
                      onChange={(e) => setCheckinWaist(Number(e.target.value))}
                      aria-invalid={!isWaistValid && isTrackingReady}
                    />
                  </label>
                  <label className="form-stack">
                    {t("tracking.chestCm")}
                    <input type="number" min={0} value={checkinChest} onChange={(e) => setCheckinChest(Number(e.target.value))} />
                  </label>
                  <label className="form-stack">
                    {t("tracking.hipsCm")}
                    <input type="number" min={0} value={checkinHips} onChange={(e) => setCheckinHips(Number(e.target.value))} />
                  </label>
                  <label className="form-stack">
                    {t("tracking.bicepsCm")}
                    <input type="number" min={0} value={checkinBiceps} onChange={(e) => setCheckinBiceps(Number(e.target.value))} />
                  </label>
                  <label className="form-stack">
                    {t("tracking.thighCm")}
                    <input type="number" min={0} value={checkinThigh} onChange={(e) => setCheckinThigh(Number(e.target.value))} />
                  </label>
                  <label className="form-stack">
                    {t("tracking.calfCm")}
                    <input type="number" min={0} value={checkinCalf} onChange={(e) => setCheckinCalf(Number(e.target.value))} />
                  </label>
                  <label className="form-stack">
                    {t("tracking.neckCm")}
                    <input type="number" min={0} value={checkinNeck} onChange={(e) => setCheckinNeck(Number(e.target.value))} />
                  </label>
                  <label className="form-stack">
                    {t("profile.checkinEnergy")}
                    <input type="number" min={1} max={5} value={checkinEnergy} onChange={(e) => setCheckinEnergy(Number(e.target.value))} />
                  </label>
                  <label className="form-stack">
                    {t("profile.checkinHunger")}
                    <input type="number" min={1} max={5} value={checkinHunger} onChange={(e) => setCheckinHunger(Number(e.target.value))} />
                  </label>
                </>
              ) : null}
            </div>

            {!isBodyFatValid && isTrackingReady ? <p className="muted">{t("tracking.bodyFatInvalid")}</p> : null}
            {checkinMode === "full" ? (
              <label className="form-stack">
                {t("profile.checkinNotes")}
                <textarea value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} rows={3} />
              </label>
            ) : null}
            {submitError ? <p className="muted">{submitError}</p> : null}

            <button
              type="submit"
              data-testid={checkinMode === "quick" ? "checkin-quick-submit" : "checkin-full-submit"}
              className={`btn ${isSubmitting ? "is-loading" : ""}`}
              style={{ width: "fit-content" }}
              disabled={checkinMode === "quick" ? isWeightEntrySubmitDisabled : isCheckinSubmitDisabled}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> {t("tracking.weightEntrySaving")}
                </>
              ) : (
                checkinMode === "quick" ? "Guardar peso de hoy" : "Guardar check-in completo"
              )}
            </button>
          </form>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {sortedCheckins.length === 0 ? (
              <div className="empty-state">
                <p className="muted">{t("profile.checkinEmpty")}</p>
              </div>
            ) : (
              sortedCheckins.slice(0, 8).map((entry) => (
                <div key={entry.id} className="feature-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{entry.date}</strong>
                    <span>
                      {[
                        `${entry.weightKg} ${t("units.kilograms")}`,
                        supportsWaist ? `${entry.waistCm} ${t("units.centimeters")}` : null,
                        supportsBodyFat ? `${entry.bodyFatPercent}${t("units.percent")}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {entry.notes ? <p style={{ marginTop: 6 }} className="muted">{entry.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
