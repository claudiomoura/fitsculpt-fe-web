"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import type { Locale } from "@/lib/i18n";
import { addDays, buildMonthGrid, isSameDay, parseDate, startOfWeek, toDateKey } from "@/lib/calendar";
import { addWeeks, clampWeekOffset, getWeekOffsetFromCurrent, getWeekStart, projectDaysForWeek } from "@/lib/planProjection";
import {
  type Goal,
  type TrainingEquipment,
  type TrainingFocus,
  type TrainingLevel,
  type SessionTime,
  type TrainingPlanData,
  type ProfileData,
} from "@/lib/profile";
import { getUserProfile, updateUserProfile } from "@/lib/profileService";
import { isProfileComplete } from "@/lib/profileCompletion";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { hasAiEntitlement, type AiEntitlementProfile } from "@/components/access/aiEntitlements";
import { requestAiTrainingPlan, saveAiTrainingPlan } from "@/components/training-plan/aiPlanGeneration";
import { AiPlanPreviewModal } from "@/components/training-plan/AiPlanPreviewModal";

type Exercise = {
  id?: string;
  name: string;
  sets: string | number;
  reps?: string;
};

type TrainingDay = {
  date?: string;
  label: string;
  focus: string;
  duration: number;
  exercises: Exercise[];
};

type TrainingPlan = Omit<TrainingPlanData, "days"> & {
  days: TrainingDay[];
};

type TrainingForm = {
  goal: Goal;
  level: TrainingLevel;
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  equipment: TrainingEquipment;
  focus: TrainingFocus;
  sessionTime: SessionTime;
};

type ActiveTrainingPlanResponse = {
  plan?: TrainingPlan | null;
};

const SELECTED_PLAN_STORAGE_KEY = "fs_selected_plan_id";
const LEGACY_ACTIVE_PLAN_STORAGE_KEY = "fs_active_training_plan_id";

type TrainingPlanClientProps = {
  mode?: "suggested" | "manual";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const baseExercisePool = {
  full: {
    gym: [] as string[],
    home: [] as string[],
  },
  upper: {
    gym: [] as string[],
    home: [] as string[],
  },
  lower: {
    gym: [] as string[],
    home: [] as string[],
  },
  push: {
    gym: [] as string[],
    home: [] as string[],
  },
  pull: {
    gym: [] as string[],
    home: [] as string[],
  },
  legs: {
    gym: [] as string[],
    home: [] as string[],
  },
};

const EXERCISE_POOL = {
  full: {
    gym: ["squat", "benchPress", "barbellRow", "romanianDeadlift", "overheadPress", "plank"],
    home: ["squat", "pushUps", "bandRow", "lunges", "pikePushUps", "plank"],
  },
  upper: {
    gym: ["benchPress", "barbellRow", "overheadPress", "pullUps", "bicepsCurl", "tricepsExtension"],
    home: ["pushUps", "bandRow", "dumbbellOverheadPress", "benchDips", "bicepsCurl", "plank"],
  },
  lower: {
    gym: ["squat", "romanianDeadlift", "legPress", "calfRaise", "hipThrust", "core"],
    home: ["squat", "lunges", "gluteBridge", "calfRaise", "goodMorning", "core"],
  },
  push: {
    gym: ["benchPress", "overheadPress", "inclinePress", "dips", "lateralRaises", "triceps"],
    home: ["pushUps", "dumbbellOverheadPress", "inclineDumbbellPress", "dips", "lateralRaises", "triceps"],
  },
  pull: {
    gym: ["barbellRow", "pullUps", "facePull", "bicepsCurl", "cableRow", "core"],
    home: ["bandRow", "assistedPullUps", "bandFacePull", "bicepsCurl", "invertedRow", "core"],
  },
  legs: {
    gym: ["squat", "romanianDeadlift", "legPress", "hamstringCurl", "calfRaise", "core"],
    home: ["squat", "lunges", "dumbbellRomanianDeadlift", "swissBallLegCurl", "calfRaise", "core"],
  },
} satisfies typeof baseExercisePool;

const DAY_LABEL_KEYS = [
  "training.dayNames.monday",
  "training.dayNames.tuesday",
  "training.dayNames.wednesday",
  "training.dayNames.thursday",
  "training.dayNames.friday",
  "training.dayNames.saturday",
  "training.dayNames.sunday",
] as const;

function durationFromSessionTime(sessionTime: SessionTime) {
  switch (sessionTime) {
    case "short":
      return 35;
    case "medium":
      return 50;
    default:
      return 65;
  }
}

function setsForLevel(level: TrainingLevel, goal: Goal) {
  if (level === "beginner") return goal === "cut" ? "2-3 x 10-12" : "3 x 8-12";
  if (level === "intermediate") return goal === "cut" ? "3 x 10-12" : "3-4 x 8-10";
  return goal === "cut" ? "3-4 x 8-12" : "4 x 6-10";
}

function buildExercises(list: string[], sets: string, maxItems: number, t: (key: string) => string): Exercise[] {
  return list.slice(0, maxItems).map((name) => ({ name: t(`training.exercises.${name}`), sets }));
}

function generatePlan(
  form: TrainingForm,
  locale: Locale,
  t: (key: string) => string
): TrainingPlan {
  const sets = setsForLevel(form.level, form.goal);
  const duration = durationFromSessionTime(form.sessionTime);
  const dayLabels = DAY_LABEL_KEYS.map((key) => t(key));
  const exercisePool = EXERCISE_POOL;
  const days = Array.from({ length: form.daysPerWeek }).map((_, i) => {
    const label = `${dayLabels[i] ?? t("training.dayLabel")} ${i + 1}`;
    const equipmentKey = form.equipment;
    let focusLabel = t("training.focusFullBody");
    let exercises: Exercise[] = [];

    if (form.focus === "upperLower") {
      const isUpper = i % 2 === 0;
      focusLabel = isUpper ? t("training.focusUpper") : t("training.focusLower");
      exercises = buildExercises(
        isUpper ? exercisePool.upper[equipmentKey] : exercisePool.lower[equipmentKey],
        sets,
        6,
        t
      );
    } else if (form.focus === "ppl") {
      const phase = i % 3;
      if (phase === 0) {
        focusLabel = t("training.focusPush");
        exercises = buildExercises(exercisePool.push[equipmentKey], sets, 6, t);
      } else if (phase === 1) {
        focusLabel = t("training.focusPull");
        exercises = buildExercises(exercisePool.pull[equipmentKey], sets, 6, t);
      } else {
        focusLabel = t("training.focusLegs");
        exercises = buildExercises(exercisePool.legs[equipmentKey], sets, 6, t);
      }
    } else {
      focusLabel = t("training.focusFullBody");
      exercises = buildExercises(exercisePool.full[equipmentKey], sets, 6, t);
    }

    return {
      label,
      focus: focusLabel,
      duration,
      exercises,
    };
  });

  return { days };
}

function createEmptyPlan(daysPerWeek: number, _locale: Locale, t: (key: string) => string): TrainingPlan {
  const dayLabels = DAY_LABEL_KEYS.map((key) => t(key));
  return {
    days: Array.from({ length: daysPerWeek }).map((_, index) => ({
      label: dayLabels[index] ?? `${t("training.dayLabel")} ${index + 1}`,
      focus: t("training.focusFullBody"),
      duration: 45,
      exercises: [],
    })),
  };
}

const periodization = [
  { label: "weekBase", detailKey: "weekBaseDesc", setsDelta: 0 },
  { label: "weekBuild", detailKey: "weekBuildDesc", setsDelta: 1 },
  { label: "weekPeak", detailKey: "weekPeakDesc", setsDelta: 2 },
  { label: "weekDeload", detailKey: "weekDeloadDesc", setsDelta: -1 },
];

export default function TrainingPlanClient({ mode = "suggested" }: TrainingPlanClientProps) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const safeT = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<TrainingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiTokenRenewalAt, setAiTokenRenewalAt] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<AiEntitlementProfile["subscriptionPlan"]>(null);
  const [aiEntitled, setAiEntitled] = useState(false);
  const [savedPlan, setSavedPlan] = useState<TrainingPlan | null>(null);
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
  const [storedPlanId, setStoredPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfirmSaving, setAiConfirmSaving] = useState(false);
  const [aiPreviewPlan, setAiPreviewPlan] = useState<TrainingPlan | null>(null);
  const [manualPlan, setManualPlan] = useState<TrainingPlan | null>(null);
  const [canManageManualDays, setCanManageManualDays] = useState<boolean>(false);
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month" | "agenda">("day");
  const [selectedDate, setSelectedDate] = useState(() => {
    const dayParam = searchParams.get("day");
    const weekOffsetParam = Number(searchParams.get("weekOffset") ?? "0");
    const dayDate = parseDate(dayParam);
    if (dayDate) return dayDate;
    if (Number.isFinite(weekOffsetParam)) {
      return addWeeks(getWeekStart(new Date()), weekOffsetParam);
    }
    return new Date();
  });
  const [isMobile, setIsMobile] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const autoGenerated = useRef(false);
  const calendarInitialized = useRef(false);
  const restoredContext = useRef(false);
  const urlSyncInitialized = useRef(false);
  const [techniqueModal, setTechniqueModal] = useState<{
    dayLabel: string;
    exercise: Exercise;
  } | null>(null);
  const isManualView = mode === "manual";

  const loadProfile = async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile();
      if (!activeRef.current) return;
      setProfile(profile);
      if (isProfileComplete(profile)) {
        setForm({
          goal: profile.goal as Goal,
          level: profile.trainingPreferences.level as TrainingLevel,
          daysPerWeek: profile.trainingPreferences.daysPerWeek as TrainingForm["daysPerWeek"],
          equipment: profile.trainingPreferences.equipment as TrainingEquipment,
          focus: profile.trainingPreferences.focus as TrainingFocus,
          sessionTime: profile.trainingPreferences.sessionTime as SessionTime,
        });
      } else {
        setForm(null);
      }
      setSavedPlan(profile.trainingPlan ?? null);
    } catch (_err) {
      if (activeRef.current) setError(t("training.profileError"));
    } finally {
      if (activeRef.current) setLoading(false);
    }
  };


  useEffect(() => {
    const controller = new AbortController();

    const detectManualDayCapability = async () => {
      try {
        const response = await fetch("/api/training-plans/placeholder/days", {
          method: "OPTIONS",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 404 || response.status === 405) {
          setCanManageManualDays(false);
          return;
        }

        const allow = (response.headers.get("allow") ?? "").toUpperCase();
        const canManage = allow.includes("POST") || allow.includes("DELETE") || response.ok;
        setCanManageManualDays(canManage);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setCanManageManualDays(false);
      }
    };

    void detectManualDayCapability();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const ref = { current: true };
    void loadProfile(ref);
    return () => {
      ref.current = false;
    };
  }, []);

  const queryPlanId = searchParams.get("planId")?.trim() ?? "";
  const selectedPlanId = queryPlanId || storedPlanId || "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persistedPlanId = (
      window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY)?.trim()
      || window.localStorage.getItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY)?.trim()
      || ""
    );
    setStoredPlanId(persistedPlanId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (queryPlanId) {
      window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, queryPlanId);
      window.localStorage.setItem(LEGACY_ACTIVE_PLAN_STORAGE_KEY, queryPlanId);
      if (storedPlanId !== queryPlanId) {
        setStoredPlanId(queryPlanId);
      }
      return;
    }

    if (!storedPlanId) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("planId", storedPlanId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [pathname, queryPlanId, router, searchParams, storedPlanId]);

  const refreshSubscription = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as AiEntitlementProfile & {
        aiTokenBalance?: number;
        aiTokenRenewalAt?: string | null;
      };
      setSubscriptionPlan(data.subscriptionPlan === "FREE" || data.subscriptionPlan === "PRO" ? data.subscriptionPlan : null);
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiTokenRenewalAt(data.aiTokenRenewalAt ?? null);
      setAiEntitled(hasAiEntitlement(data));
      window.dispatchEvent(new Event("auth:refresh"));
    } catch (_err) {
    }
  };

  useEffect(() => {
    void refreshSubscription();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadActivePlan = async () => {
      try {
        if (selectedPlanId) {
          const selectedResponse = await fetch(`/api/training-plans/${encodeURIComponent(selectedPlanId)}`, {
            cache: "no-store",
            signal: controller.signal,
          });

          if (selectedResponse.ok) {
            const selectedPayload = (await selectedResponse.json()) as TrainingPlan;
            setActivePlan(selectedPayload);
            return;
          }

          setActivePlan(null);
          return;
        }

        const response = await fetch("/api/training-plans/active?includeDays=1", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 404 || response.status === 405) {
          setActivePlan(null);
          return;
        }

        if (!response.ok) {
          setActivePlan(null);
          return;
        }

        const payload = (await response.json()) as ActiveTrainingPlanResponse;
        setActivePlan(payload.plan ?? null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setActivePlan(null);
      }
    };

    void loadActivePlan();
    return () => controller.abort();
  }, [selectedPlanId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = () => {
      setIsMobile(media.matches);
    };
    handleChange();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const plan = useMemo(() => (form ? generatePlan(form, locale, t) : null), [form, locale, t]);
  const visiblePlan = isManualView ? savedPlan ?? plan : activePlan;
  const planStartDate = useMemo(
    () => parseDate(visiblePlan?.startDate ?? visiblePlan?.days?.[0]?.date),
    [visiblePlan?.startDate, visiblePlan?.days]
  );
  const planDays = visiblePlan?.days ?? [];
  const storePlanContext = () => {
    if (typeof window === "undefined") return null;
    const ctxKey = `training-plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const payload = {
      scrollY: window.scrollY,
      selectedDate: selectedDate.toISOString(),
      calendarView,
    };
    window.sessionStorage.setItem(ctxKey, JSON.stringify(payload));
    return ctxKey;
  };

  const handleExerciseNavigate = (exerciseId?: string, dayDate?: Date) => {
    if (!exerciseId) return;
    const ctxKey = storePlanContext();
    const dayKey = dayDate ? toDateKey(dayDate) : null;
    const returnParams = new URLSearchParams(searchParams.toString());
    if (ctxKey) {
      returnParams.set("ctx", ctxKey);
    }
    if (dayKey) {
      returnParams.set("dayKey", dayKey);
    }
    const returnTo = `${pathname}${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;
    const detailParams = new URLSearchParams();
    detailParams.set("from", "plan");
    detailParams.set("returnTo", returnTo);
    if (dayKey) {
      detailParams.set("dayKey", dayKey);
    }
    if (ctxKey) {
      detailParams.set("ctx", ctxKey);
    }
    router.push(`/app/biblioteca/${exerciseId}?${detailParams.toString()}`);
  };

  const handleExerciseKeyDown = (event: KeyboardEvent<HTMLDivElement>, exerciseId?: string, dayDate?: Date) => {
    if (!exerciseId) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleExerciseNavigate(exerciseId, dayDate);
    }
  };

  const planEntries = useMemo(
    () =>
      planDays
        .map((day, index) => {
          const date = day.date ? parseDate(day.date) : planStartDate ? addDays(planStartDate, index) : null;
          return date ? { day, index, date } : null;
        })
        .filter((entry): entry is { day: TrainingDay; index: number; date: Date } => Boolean(entry)),
    [planDays, planStartDate]
  );
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const maxProjectedWeeksAhead = 3;
  const weekOffset = useMemo(() => getWeekOffsetFromCurrent(weekStart), [weekStart]);
  const clampedWeekOffset = useMemo(
    () => clampWeekOffset(weekOffset, maxProjectedWeeksAhead),
    [weekOffset, maxProjectedWeeksAhead]
  );
  const modelWeekStart = useMemo(() => {
    if (planEntries.length > 0) {
      return getWeekStart(planEntries[0].date);
    }
    return getWeekStart(new Date());
  }, [planEntries]);
  const projectedWeek = useMemo(
    () => projectDaysForWeek({ entries: planEntries, selectedWeekStart: weekStart, modelWeekStart }),
    [planEntries, weekStart, modelWeekStart]
  );
  const visiblePlanEntries = useMemo(() => {
    const all = new Map<string, { day: TrainingDay; index: number; date: Date; isReplicated: boolean }>();
    planEntries.forEach((entry) => {
      all.set(toDateKey(entry.date), { ...entry, isReplicated: false });
    });
    for (let offset = 1; offset <= maxProjectedWeeksAhead; offset += 1) {
      const nextWeek = projectDaysForWeek({
        entries: planEntries,
        selectedWeekStart: addWeeks(getWeekStart(new Date()), offset),
        modelWeekStart,
      });
      if (!nextWeek.isReplicated) continue;
      nextWeek.days.forEach((entry) => {
        const key = toDateKey(entry.date);
        if (!all.has(key)) {
          all.set(key, { ...entry, isReplicated: true });
        }
      });
    }
    return Array.from(all.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [maxProjectedWeeksAhead, planEntries, modelWeekStart]);
  const visibleDayMap = useMemo(() => {
    const next = new Map<string, { day: TrainingDay; index: number; date: Date; isReplicated: boolean }>();
    visiblePlanEntries.forEach((entry) => {
      next.set(toDateKey(entry.date), entry);
    });
    return next;
  }, [visiblePlanEntries]);
  const selectedVisiblePlanDay = useMemo(() => visibleDayMap.get(toDateKey(selectedDate)) ?? null, [selectedDate, visibleDayMap]);
  const isSelectedDayReplicated = selectedVisiblePlanDay?.isReplicated ?? false;
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const monthDates = useMemo(() => buildMonthGrid(selectedDate), [selectedDate]);
  const localeCode = locale === "es" ? "es-ES" : "en-US";
  const monthLabel = selectedDate.toLocaleDateString(localeCode, { month: "long", year: "numeric" });
  const today = new Date();
  const calendarOptions = useMemo(() => {
    const baseOptions = [
      { value: "today", label: t("calendar.today") },
      { value: "week", label: t("calendar.viewWeek") },
      { value: "month", label: t("calendar.viewMonth") },
    ];
    const agendaOption = { value: "agenda", label: t("calendar.viewAgenda") };
    return isMobile ? [agendaOption, ...baseOptions] : [...baseOptions, agendaOption];
  }, [isMobile, t]);

  useEffect(() => {
    if (manualPlan) return;
    if (savedPlan) {
      setManualPlan(savedPlan);
      return;
    }
    if (plan) {
      setManualPlan(plan);
      return;
    }
    if (form) {
      setManualPlan(createEmptyPlan(form.daysPerWeek, locale, t));
    }
  }, [manualPlan, savedPlan, plan, form, locale, t]);

  useEffect(() => {
    if (!planStartDate || calendarInitialized.current) return;
    calendarInitialized.current = true;
    setSelectedDate(new Date());
  }, [planStartDate]);

  const ensurePlanStartDate = (planData: TrainingPlan, date = new Date()) => {
    const baseDate = parseDate(planData.startDate) ?? date;
    const days = planData.days.map((day, index) => ({
      ...day,
      date: day.date ?? toDateKey(addDays(baseDate, index)),
    }));
    return { ...planData, startDate: baseDate.toISOString(), days };
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const nextPlan = ensurePlanStartDate(plan);
      const updated = await updateUserProfile({ trainingPlan: nextPlan });
      setSavedPlan(updated.trainingPlan ?? nextPlan);
      setSaveMessage(t("training.savePlanSuccess"));
    } catch (_err) {
      setSaveMessage(t("training.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleSaveManualPlan = async () => {
    if (!manualPlan) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const nextPlan = ensurePlanStartDate(manualPlan);
      const updated = await updateUserProfile({ trainingPlan: nextPlan });
      setSavedPlan(updated.trainingPlan ?? nextPlan);
      setSaveMessage(t("training.manualSaveSuccess"));
    } catch (_err) {
      setSaveMessage(t("training.savePlanError"));
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleSetStartDate = async () => {
    if (!visiblePlan) return;
    const nextPlan = ensurePlanStartDate({ ...visiblePlan, startDate: new Date().toISOString() });
    const updated = await updateUserProfile({ trainingPlan: nextPlan });
    setSavedPlan(updated.trainingPlan ?? nextPlan);
    setManualPlan(updated.trainingPlan ?? nextPlan);
  };

  function updateManualDay(dayIndex: number, field: keyof TrainingDay, value: string | number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const day = { ...days[dayIndex], [field]: value };
      days[dayIndex] = day;
      return { ...prev, days };
    });
  }

  function updateManualExercise(
    dayIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string
  ) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = [...days[dayIndex].exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], [field]: value };
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }

  function addManualExercise(dayIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = [...days[dayIndex].exercises, { name: "", sets: "", reps: "" }];
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }

  function removeManualExercise(dayIndex: number, exerciseIndex: number) {
    setManualPlan((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = days[dayIndex].exercises.filter((_, index) => index !== exerciseIndex);
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  }


  function addManualDay() {
    if (!canManageManualDays) return;
    setManualPlan((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.days.length;
      return {
        ...prev,
        days: [
          ...prev.days,
          {
            label: `${t("training.dayLabel")} ${nextIndex + 1}`,
            focus: t("training.focusFullBody"),
            duration: 45,
            exercises: [],
          },
        ],
      };
    });
  }

  function removeManualDay(dayIndex: number) {
    if (!canManageManualDays) return;
    setManualPlan((prev) => {
      if (!prev) return prev;
      if (prev.days.length <= 1) return prev;
      return {
        ...prev,
        days: prev.days.filter((_, index) => index !== dayIndex),
      };
    });
  }

  const handleAiPlan = async () => {
    if (!profile || !form) return;
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=training&next=/app/entrenamiento");
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const result = await requestAiTrainingPlan(profile, {
        goal: form.goal,
        level: form.level,
        daysPerWeek: form.daysPerWeek,
        equipment: form.equipment,
        focus: form.focus,
        sessionTime: form.sessionTime,
      });
      if (typeof result.aiTokenBalance === "number") {
        setAiTokenBalance(result.aiTokenBalance);
      }
      if (typeof result.aiTokenRenewalAt === "string" || result.aiTokenRenewalAt === null) {
        setAiTokenRenewalAt(result.aiTokenRenewalAt ?? null);
      }
      setAiPreviewPlan(result.plan);
      setSaveMessage(t("training.aiPreviewReady"));
      void refreshSubscription();
    } catch (err) {
      if (err instanceof Error && err.message === "INSUFFICIENT_TOKENS") {
        setError(t("ai.insufficientTokens"));
      } else if (err instanceof Error && err.message === "INVALID_AI_OUTPUT") {
        setError(t("training.aiInvalidOutput"));
      } else if (err instanceof Error && err.message && err.message !== "AI_GENERATION_FAILED") {
        setError(err.message);
      } else {
        setError(t("training.aiError"));
      }
    } finally {
      setAiLoading(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  useEffect(() => {
    if (!profile || !form) return;
    if (autoGenerated.current) return;
    if (searchParams.get("ai") !== "1") return;
    autoGenerated.current = true;
    void handleAiPlan();
  }, [profile, form, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (restoredContext.current) return;
    const ctxKey = searchParams.get("ctx");
    if (!ctxKey) return;
    const stored = window.sessionStorage.getItem(ctxKey);
    if (!stored) return;
    restoredContext.current = true;
    try {
      const parsed = JSON.parse(stored) as {
        scrollY?: number;
        selectedDate?: string;
        calendarView?: string;
      };
      if (parsed.selectedDate) {
        const nextDate = new Date(parsed.selectedDate);
        if (!Number.isNaN(nextDate.getTime())) {
          setSelectedDate(nextDate);
        }
      }
      if (parsed.calendarView && ["day", "week", "month", "agenda"].includes(parsed.calendarView)) {
        setCalendarView(parsed.calendarView as typeof calendarView);
      }
      if (typeof parsed.scrollY === "number") {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, parsed.scrollY ?? 0);
        });
      }
      window.sessionStorage.removeItem(ctxKey);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("ctx");
      const nextUrl = `${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`;
      router.replace(nextUrl);
    } catch (_err) {
      window.sessionStorage.removeItem(ctxKey);
    }
  }, [calendarView, pathname, router, searchParams]);

  useEffect(() => {
    if (!urlSyncInitialized.current) {
      urlSyncInitialized.current = true;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    const offset = getWeekOffsetFromCurrent(weekStart);
    params.set("day", toDateKey(selectedDate));
    if (offset !== 0) {
      params.set("weekOffset", String(offset));
    } else {
      params.delete("weekOffset");
    }
    const nextUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, selectedDate, weekStart]);

  const handleGenerateClick = () => {
    if (!profile) return;
    if (!isProfileComplete(profile)) {
      router.push("/app/onboarding?ai=training&next=/app/entrenamiento");
      return;
    }
    void handleAiPlan();
  };

  const handleConfirmAiPlan = async () => {
    if (!aiPreviewPlan) return;
    setAiConfirmSaving(true);
    setError(null);
    try {
      const updated = await saveAiTrainingPlan(aiPreviewPlan);
      setSavedPlan(updated.trainingPlan ?? aiPreviewPlan);
      setAiPreviewPlan(null);
      setSaveMessage(t("training.aiSuccess"));
    } catch (_err) {
      setError(t("training.savePlanError"));
    } finally {
      setAiConfirmSaving(false);
      window.setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handlePrevDay = () => {
    setSelectedDate((prev) => addDays(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => addDays(prev, 1));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null) return;
    const delta = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      handlePrevDay();
    } else {
      handleNextDay();
    }
  };

  const hasPlan = Boolean(visiblePlan?.days.length);
  const isAiLocked = !aiEntitled || (subscriptionPlan === "FREE" && (aiTokenBalance ?? 0) <= 0);
  const isAiDisabled = aiLoading || isAiLocked || !form;
  const handleRetry = () => window.location.reload();
  const buildSetLines = (exercise: Exercise) => {
    const setsValue = String(exercise.sets);
    const match = setsValue.match(/\d+/);
    const count = match ? Number(match[0]) : 1;
    const detail = exercise.reps ? `${exercise.reps} ${t("training.repsLabel")}` : setsValue;
    return Array.from({ length: Math.max(1, count) }, (_, index) => ({
      id: `${exercise.name}-${index}`,
      label: `${index + 1}. ${t("training.setLabel")} ${detail}`,
    }));
  };

  return (
    <div className="page">
      {!isManualView ? (
        <>
          <section className="card">
<div className="section-head section-head-actions">
  <div className="min-w-0">
    <h2 className="section-title section-title-sm">{t("training.formTitle")}</h2>
    <p className="section-subtitle">{t("training.tips")}</p>
  </div>

  <div className="section-actions">
    {/* <button type="button" className="btn" disabled={!form} onClick={() => loadProfile({ current: true })}>
      {t("training.generate")}
    </button> */}

    <button
      type="button"
      className="btn"
      disabled={isAiDisabled}
      onClick={handleGenerateClick}
    >
      {aiLoading ? t("training.aiGenerating") : t("training.aiGenerate")}
    </button>

    {/* <button type="button" className="btn secondary" disabled={!plan || saving} onClick={handleSavePlan}>
      {saving ? t("training.savePlanSaving") : t("training.savePlan")}
    </button> */}

    <Link href="/app/entrenamiento/editar" className="btn secondary">
      {t("training.editPlan")}
    </Link>
  </div>
</div>

            {aiTokenBalance !== null ? (
              <p className="muted mt-8">
                {t("ai.tokensRemaining")} {aiTokenBalance}
                {aiTokenRenewalAt ? ` · ${t("ai.tokensReset")} ${formatDate(aiTokenRenewalAt)}` : ""}
              </p>
            ) : null}

            {isAiLocked ? (
              <div className="feature-card mt-12">
                <strong>{t("aiLockedTitle")}</strong>
                <p className="muted mt-6">{aiEntitled ? t("aiLockedSubtitle") : t("ai.notPro")}</p>
              </div>
            ) : null}


            {loading ? (
              <div className="form-stack">
                <Skeleton variant="line" className="w-40" />
                <Skeleton variant="line" className="w-60" />
              </div>
            ) : error ? (
              <div className="status-card status-card--warning">
                <div className="inline-actions-sm">
                  <Icon name="warning" />
                  <strong>{t("training.errorTitle")}</strong>
                </div>
                <p className="muted">{error}</p>
                <button type="button" className="btn secondary fit-content" onClick={handleRetry}>
                  {t("ui.retry")}
                </button>
              </div>
            ) : saveMessage ? (
              <p className="muted">{saveMessage}</p>
            ) : form ? (
              <div className="badge-list">
                <Badge>
                  {t("training.goal")}: {t(form.goal === "cut" ? "training.goalCut" : form.goal === "bulk" ? "training.goalBulk" : "training.goalMaintain")}
                </Badge>
                <Badge>
                  {t("training.level")}: {t(form.level === "beginner" ? "training.levelBeginner" : form.level === "intermediate" ? "training.levelIntermediate" : "training.levelAdvanced")}
                </Badge>
                <Badge>{t("training.daysPerWeek")}: {form.daysPerWeek}</Badge>
                <Badge>
                  {t("training.equipment")}: {form.equipment === "gym" ? t("training.equipmentGym") : t("training.equipmentHome")}
                </Badge>
                <Badge>
                  {t("training.sessionTime")}: {t(form.sessionTime === "short" ? "training.sessionTimeShort" : form.sessionTime === "long" ? "training.sessionTimeLong" : "training.sessionTimeMedium")}
                </Badge>
                <Badge>
                  {t("training.focus")}: {t(form.focus === "ppl" ? "training.focusPushPullLegs" : form.focus === "upperLower" ? "training.focusUpperLower" : "training.focusFullBody")}
                </Badge>
              </div>
            ) : null}

            <p className="muted mt-12">
              {t("training.preferencesHint")}
            </p>
          </section>

          {!loading && !error && profile && !isProfileComplete(profile) ? (
            <section className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Icon name="info" />
                </div>
                <div>
                  <h3 className="m-0">{t("training.profileIncompleteTitle")}</h3>
                  <p className="muted">{t("training.profileIncompleteSubtitle")}</p>
                </div>
                <ButtonLink href="/app/onboarding?next=/app/entrenamiento">
                  {t("profile.openOnboarding")}
                </ButtonLink>
              </div>
            </section>
          ) : !loading && !error && !hasPlan ? (
            <section className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Icon name="dumbbell" />
                </div>
                <div>
                  <h3 className="m-0">{t("training.noSelectedPlanTitle")}</h3>
                  <p className="muted">{t("training.noSelectedPlanSubtitle")}</p>
                </div>
                <div className="empty-state-actions">
                  <ButtonLink href="/app/biblioteca/entrenamientos">
                    {t("training.selectPlanCta")}
                  </ButtonLink>
                </div>
              </div>
            </section>
          ) : hasPlan ? (
            <section className="card">
              <div className="section-head section-head-actions">
                <div>
                  <h2 className="section-title section-title-sm">{t("training.calendarTitle")}</h2>
                  <p className="section-subtitle">{t("training.calendarSubtitle")}</p>
                </div>
                <div className="section-actions calendar-actions">
                  <div className="segmented-control">
                    {calendarOptions.map((option) => {
                      const isActive =
                        option.value === "today" ? calendarView === "day" : calendarView === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`segmented-control-btn ${isActive ? "active" : ""}`}
                          onClick={() => {
                            if (option.value === "today") {
                              setSelectedDate(new Date());
                              setCalendarView("day");
                              return;
                            }
                            setCalendarView(option.value as typeof calendarView);
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!planStartDate ? (
                <div className="calendar-empty">
                  <div className="empty-state">
                    <h3 className="m-0">{t("training.calendarStartDateTitle")}</h3>
                    <p className="muted">{t("training.calendarStartDateSubtitle")}</p>
                    <Button onClick={handleSetStartDate}>
                      {t("training.calendarStartDateCta")}
                    </Button>
                  </div>
                  <div className="list-grid">
                    {visiblePlan?.days.map((day, dayIdx) => {
                      const dayDate = day.date ? parseDate(day.date) : null;
                      return (
                      <details key={`${day.label}-${dayIdx}`} className="accordion-card">
                        <summary>
                          <span>{t("training.dayLabel")} {day.label}</span>
                          <span className="muted">
                            {day.focus} · {day.duration} {t("training.minutesLabel")}
                          </span>
                        </summary>
                        <div className="list-grid mt-12">
                          {day.exercises.map((exercise, exerciseIdx) => (
                            <div
                              key={`${exercise.name}-${exerciseIdx}`}
                              className={`exercise-mini-card ${exercise.id ? "is-clickable" : "is-disabled"}`}
                              role={exercise.id ? "button" : undefined}
                              tabIndex={exercise.id ? 0 : undefined}
                              aria-disabled={!exercise.id}
                              aria-label={
                                exercise.id
                                  ? `${t("training.exerciseLink")}: ${exercise.name}`
                                  : `${exercise.name}: ${t("training.exerciseUnavailable")}`
                              }
                              onClick={() => handleExerciseNavigate(exercise.id, dayDate ?? undefined)}
                              onKeyDown={(event) => handleExerciseKeyDown(event, exercise.id, dayDate ?? undefined)}
                            >
                              <strong>{exercise.name}</strong>
                              <span className="muted">
                                {exercise.reps ? `${exercise.sets} x ${exercise.reps}` : exercise.sets}
                              </span>
                              {!exercise.id ? <small className="muted">{t("training.exerciseUnavailable")}</small> : null}
                              <button
                                type="button"
                                className="btn secondary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setTechniqueModal({ dayLabel: day.label, exercise });
                                }}
                              >
                                {t("training.viewTechnique")}
                              </button>
                            </div>
                          ))}
                        </div>
                      </details>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {calendarView === "day" ? (
                    <div
                      role="presentation"
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      className="calendar-day"
                    >
                      <div className="calendar-day-header">
                        <div>
                          <strong>{selectedDate.toLocaleDateString(localeCode, { weekday: "long", month: "short", day: "numeric" })}</strong>
                          <p className="muted mt-4 mb-0">
                            {selectedVisiblePlanDay?.day.focus ?? safeT("training.calendarEmptyFocus", t("training.restDayTitle"))}
                          </p>
                        </div>
                        <div className="calendar-day-actions">
                          <button type="button" className="btn secondary" onClick={handlePrevDay}>
                            {t("training.dayPrev")}
                          </button>
                          <button type="button" className="btn secondary" onClick={handleNextDay}>
                            {t("training.dayNext")}
                          </button>
                        </div>
                      </div>
                      {selectedVisiblePlanDay ? (
                        <>
                          <div className="calendar-day-meta">
                            <span className="badge">{selectedVisiblePlanDay.day.label}</span>
                            <span className="badge">
                              {selectedVisiblePlanDay.day.duration} {t("training.minutesLabel")}
                            </span>
                            {isSelectedDayReplicated ? <Badge variant="muted">{t("plan.replicatedWeekLabel")}</Badge> : null}
                          </div>
                          {selectedVisiblePlanDay.day.exercises.length ? (
                            <div className="exercise-list">
                              {selectedVisiblePlanDay.day.exercises.map((exercise, exerciseIdx) => (
                                <div
                                  key={`${exercise.name}-${exerciseIdx}`}
                                  className={`exercise-row ${exercise.id ? "is-clickable" : "is-disabled"}`}
                                  role={exercise.id ? "button" : undefined}
                                  tabIndex={exercise.id ? 0 : undefined}
                                  aria-disabled={!exercise.id}
                                  aria-label={
                                    exercise.id
                                      ? `${t("training.exerciseLink")}: ${exercise.name}`
                                      : `${exercise.name}: ${t("training.exerciseUnavailable")}`
                                  }
                                  onClick={() => handleExerciseNavigate(exercise.id, selectedVisiblePlanDay.date)}
                                  onKeyDown={(event) => handleExerciseKeyDown(event, exercise.id, selectedVisiblePlanDay.date)}
                                >
                                  <img
                                    src="/placeholders/exercise-cover.svg"
                                    alt={t("library.mediaAlt")}
                                    className="exercise-thumb"
                                  />
                                  <div className="exercise-row-main">
                                    <div className="exercise-row-head">
                                      <strong>{exercise.name}</strong>
                                      <button
                                        type="button"
                                        className="btn secondary"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setTechniqueModal({ dayLabel: selectedVisiblePlanDay.day.label, exercise });
                                        }}
                                      >
                                        {t("training.viewTechnique")}
                                      </button>
                                    </div>
                                    <div className="exercise-set-lines">
                                      {buildSetLines(exercise).map((line) => (
                                        <span key={line.id} className="muted">
                                          {line.label}
                                        </span>
                                      ))}
                                    </div>
                                    {!exercise.id ? <small className="muted">{t("training.exerciseUnavailable")}</small> : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="feature-card">
                              <strong>{t("training.restDayTitle")}</strong>
                              <p className="muted mt-6">{t("training.restDaySubtitle")}</p>
                              <ul className="list-muted">
                                <li>{t("training.restDayTipOne")}</li>
                                <li>{t("training.restDayTipTwo")}</li>
                                <li>{t("training.restDayTipThree")}</li>
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="empty-state">
                          <p className="muted">{safeT("training.calendarEmptyDay", t("training.emptySubtitle"))}</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {calendarView === "week" ? (
                    <div className="calendar-week">
                      <div className="calendar-range">
                        <button
                          type="button"
                          className="btn secondary"
                          aria-label={t("calendar.previousWeekAria")}
                          onClick={() => setSelectedDate((prev) => addWeeks(prev, -1))}
                        >
                          {t("calendar.previousWeek")}
                        </button>
                        <strong>
                          {t("training.weekLabel")} {clampedWeekOffset + 1}
                        </strong>
                        <span className="muted">{weekStart.toLocaleDateString(localeCode, { month: "short", day: "numeric" })} → {addDays(weekStart, 6).toLocaleDateString(localeCode, { month: "short", day: "numeric" })}</span>
                        <button
                          type="button"
                          className="btn secondary"
                          aria-label={t("calendar.nextWeekAria")}
                          onClick={() => setSelectedDate((prev) => addWeeks(prev, 1))}
                          disabled={weekOffset >= maxProjectedWeeksAhead}
                        >
                          {t("calendar.nextWeek")}
                        </button>
                        {projectedWeek.isReplicated ? <Badge variant="muted">{t("plan.replicatedWeekLabel")}</Badge> : null}
                      </div>
                      <div className="calendar-week-grid">
                        {weekDates.map((date) => {
                          const entry = visibleDayMap.get(toDateKey(date));
                          return (
                            <button
                              key={toDateKey(date)}
                              type="button"
                              className={`calendar-day-card ${entry ? "has-plan" : "is-empty"} ${isSameDay(date, today) ? "is-today" : ""}`}
                              onClick={() => {
                                setSelectedDate(date);
                                setCalendarView("day");
                              }}
                            >
                              <div className="calendar-day-card-header">
                                <span>{date.toLocaleDateString(localeCode, { weekday: "short" })}</span>
                                <strong>{date.getDate()}</strong>
                              </div>
                              {entry ? (
                                <div className="calendar-day-card-body">
                                  <span className="badge">{entry.day.label}</span>
                                  <p className="muted">{entry.day.focus}</p>
                                  <span className="calendar-dot" />
                                </div>
                              ) : (
                                <p className="muted">{safeT("training.calendarEmptyShort", t("training.emptySubtitle"))}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {calendarView === "month" ? (
                    <div className="calendar-month">
                      <div className="calendar-range">
                        <strong>{monthLabel}</strong>
                      </div>
                      <div className="calendar-month-grid">
                        {monthDates.map((date) => {
                          const entry = visibleDayMap.get(toDateKey(date));
                          const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                          return (
                            <button
                              key={toDateKey(date)}
                              type="button"
                              className={`calendar-month-cell ${isCurrentMonth ? "" : "is-muted"} ${entry ? "has-plan" : ""} ${isSameDay(date, today) ? "is-today" : ""}`}
                              onClick={() => {
                                setSelectedDate(date);
                                setCalendarView("day");
                              }}
                            >
                              <span>{date.getDate()}</span>
                              {entry ? <span className="calendar-dot" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {calendarView === "agenda" ? (
                    <div className="calendar-agenda">
                      {visiblePlanEntries.map((entry) => (
                        <button
                          key={`${entry.day.label}-${toDateKey(entry.date)}`}
                          type="button"
                          className="calendar-agenda-item"
                          onClick={() => {
                            setSelectedDate(entry.date);
                            setCalendarView("day");
                          }}
                        >
                          <div>
                            <strong>{entry.date.toLocaleDateString(localeCode, { weekday: "short", day: "numeric", month: "short" })}</strong>
                            <p className="muted">{entry.day.focus}</p>
                          </div>
                          <span className="badge">{entry.day.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          {hasPlan && (
            <section className="card">
              <div className="section-head">
                <div>
                  <h2 className="section-title section-title-sm">{t("training.periodTitle")}</h2>
                  <p className="section-subtitle">{t("training.periodSubtitle")}</p>
                </div>
              </div>
              <div className="mesocycle-grid">
                {periodization.map((week, idx) => (
                  <div key={`${week.label}-${idx}`} className="feature-card mesocycle-card">
                    <span className="badge">{t("training.weekLabel")} {idx + 1}</span>
                    <strong>{t(`training.${week.label}`)}</strong>
                    <p className="muted">{t(`training.${week.detailKey}`)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}

      {isManualView ? (
        <section className="card">
          <div className="section-head">
            <div>
              <h2 className="section-title section-title-sm">{t("training.manualPlanTitle")}</h2>
              <p className="section-subtitle">{t("training.manualPlanSubtitle")}</p>
            </div>
            <div className="inline-actions-sm">
              <button type="button" className="btn secondary" onClick={() => visiblePlan && setManualPlan(visiblePlan)}>
                {t("training.manualPlanReset")}
              </button>
              <button type="button" className="btn" disabled={!manualPlan || saving} onClick={handleSaveManualPlan}>
                {saving ? t("training.savePlanSaving") : t("training.manualPlanSave")}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="muted">{t("training.profileLoading")}</p>
          ) : error ? (
            <p className="muted">{error}</p>
          ) : saveMessage ? (
            <p className="muted">{saveMessage}</p>
          ) : null}

          {manualPlan ? (
            <div className="form-stack">
              {manualPlan.days.map((day, dayIndex) => (
                <div key={`manual-day-${dayIndex}`} className="feature-card stack-md">
                  <div className="inline-grid-2">
                    <div className="inline-actions-sm" style={{ gridColumn: "1 / -1", justifyContent: "space-between" }}>
                      <button type="button" className="btn secondary" onClick={addManualDay} disabled={!canManageManualDays}>
                        {t("training.manualDayAdd")}
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => removeManualDay(dayIndex)}
                        disabled={!canManageManualDays || manualPlan.days.length <= 1}
                      >
                        {t("training.manualDayRemove")}
                      </button>
                    </div>
                    {!canManageManualDays ? <p className="muted" style={{ gridColumn: "1 / -1" }}>{t("training.manualDayControlsUnavailable")}</p> : null}
                    <label className="form-stack">
                      {t("training.manualDayLabel")}
                      <input
                        value={day.label}
                        onChange={(e) => updateManualDay(dayIndex, "label", e.target.value)}
                      />
                    </label>
                    <label className="form-stack">
                      {t("training.manualDayFocus")}
                      <input
                        value={day.focus}
                        onChange={(e) => updateManualDay(dayIndex, "focus", e.target.value)}
                      />
                    </label>
                    <label className="form-stack">
                      {t("training.manualDayDuration")}
                      <input
                        type="number"
                        min={20}
                        max={120}
                        value={day.duration}
                        onChange={(e) => updateManualDay(dayIndex, "duration", Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <div className="form-stack">
                    {day.exercises.length === 0 ? (
                      <p className="muted">{t("training.manualExercisesEmpty")}</p>
                    ) : (
                      day.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={`manual-exercise-${dayIndex}-${exerciseIndex}`}
                          className="training-manual-row"
                        >
                          <input
                            value={exercise.name}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "name", e.target.value)}
                            placeholder={t("training.manualExerciseName")}
                          />
                          <input
                            value={exercise.sets}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "sets", e.target.value)}
                            placeholder={t("training.manualExerciseSets")}
                          />
                          <input
                            value={exercise.reps ?? ""}
                            onChange={(e) => updateManualExercise(dayIndex, exerciseIndex, "reps", e.target.value)}
                            placeholder={t("training.manualExerciseReps")}
                          />
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => removeManualExercise(dayIndex, exerciseIndex)}
                          >
                            {t("training.manualExerciseRemove")}
                          </button>
                        </div>
                      ))
                    )}
                    <button type="button" className="btn secondary" onClick={() => addManualExercise(dayIndex)}>
                      {t("training.manualExerciseAdd")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{t("training.manualPlanEmpty")}</p>
          )}
        </section>
      ) : null}

      {techniqueModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setTechniqueModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-technique-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 id="exercise-technique-title" className="modal-header-title">{techniqueModal.exercise.name}</h3>
                <p className="muted modal-header-subtitle">
                  {t("training.techniqueSubtitle")} {techniqueModal.dayLabel}
                </p>
              </div>
              <button type="button" className="btn secondary" onClick={() => setTechniqueModal(null)}>
                {t("ui.closeLabel")}
              </button>
            </div>
            <div className="modal-content-stack">
              <img
                src="/placeholders/exercise-demo.svg"
                alt={t("training.techniquePlaceholderAlt")}
                className="modal-image"
              />
              <div className="feature-card">
                <strong>{t("ui.technique")}</strong>
                <p className="muted modal-section-copy">
                  {t("training.techniquePlaceholder")}
                </p>
                <p className="modal-section-copy">
                  {t("training.techniqueSets")}: {techniqueModal.exercise.sets}
                </p>
                {techniqueModal.exercise.reps && (
                  <p className="muted modal-section-copy-tight">
                    {t("training.techniqueReps")}: {techniqueModal.exercise.reps}
                  </p>
                )}
              </div>
              <div className="feature-card">
                <strong>{t("ui.tips")}</strong>
                <ul className="list-muted">
                  <li>{t("training.techniqueTipOne")}</li>
                  <li>{t("training.techniqueTipTwo")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AiPlanPreviewModal
        open={Boolean(aiPreviewPlan)}
        plan={aiPreviewPlan}
        title={t("training.aiPreviewTitle")}
        description={t("training.aiPreviewSubtitle")}
        cancelLabel={t("training.aiPreviewCancel")}
        confirmLabel={t("training.aiPreviewConfirm")}
        savingLabel={t("training.aiPreviewConfirming")}
        durationUnit={t("training.minutesLabel")}
        onClose={() => setAiPreviewPlan(null)}
        onConfirm={handleConfirmAiPlan}
        isSaving={aiConfirmSaving}
      />
    </div>
  );
}
