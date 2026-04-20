"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { useLanguage } from "@/context/LanguageProvider";
import { trackEvent } from "@/lib/analytics";
import { parseDate } from "@/lib/calendar";
import { fetchAuthMe } from "@/lib/authDedup";
import { hasAiEntitlement } from "@/components/access/aiEntitlements";
import { compressAvatarToDataUrl } from "@/lib/avatarUpload";
import { findQuickLogFoodByBarcode, searchQuickLogFoods, type QuickLogFoodItem } from "@/lib/quickLogFoodCatalog";
import { parseQuickVoiceMeal } from "@/lib/quickLogVoiceParser";
import { createTrackingEntry, type CheckinEntry, type MealLogEntry } from "@/services/tracking";
import { analyzeMealPhoto, completeMeal, createMealLog, updateMealLog, MealPhotoAnalysisError, type CreateMealParams } from "@/services/mealApi";
import { sendRctEvent } from "@/services/futureProjection";
import { NUTRITION_ADHERENCE_EVENT } from "@/lib/nutritionAdherence";
import styles from "./QuickLogHub.module.css";

type Mode = "meal" | "water" | "weight";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type QuickLogHubProps = {
  origin: "today" | "nutrition";
  latestCheckin: CheckinEntry | null;
  currentWeightKg?: number | null;
  defaultMealDate?: string;
  showLauncher?: boolean;
  onSaved?: (payload: { mode: Mode; date?: string; mealType?: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" }) => Promise<void> | void;
};

export type QuickLogHubHandle = {
  open: (mode?: Mode) => void;
};

function toTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function mealEntryFromDraft(args: {
  date: string;
  title: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}): MealLogEntry {
  const now = new Date().toISOString();
  return {
    id: `${args.date}-${Date.now()}-quick-meal`,
    date: args.date,
    mealKey: `quick:${args.date}:${Date.now()}`,
    mealType: args.mealType || "meal",
    title: args.title.trim() || "Quick meal",
    calories: Math.max(0, Math.round(args.calories)),
    protein: Math.max(0, Math.round(args.protein)),
    carbs: Math.max(0, Math.round(args.carbs)),
    fats: Math.max(0, Math.round(args.fats)),
    completedAt: now,
  };
}

function checkinFromWeight(date: string, weightKg: number, latestCheckin: CheckinEntry | null): CheckinEntry {
  return {
    id: `${date}-${Date.now()}-quick-weight`,
    date,
    weightKg,
    chestCm: Number(latestCheckin?.chestCm ?? 0),
    waistCm: Number(latestCheckin?.waistCm ?? 0),
    hipsCm: Number(latestCheckin?.hipsCm ?? 0),
    bicepsCm: Number(latestCheckin?.bicepsCm ?? 0),
    thighCm: Number(latestCheckin?.thighCm ?? 0),
    calfCm: Number(latestCheckin?.calfCm ?? 0),
    neckCm: Number(latestCheckin?.neckCm ?? 0),
    bodyFatPercent: Number(latestCheckin?.bodyFatPercent ?? 0),
    energy: Number(latestCheckin?.energy ?? 3),
    hunger: Number(latestCheckin?.hunger ?? 3),
    notes: "",
    recommendation: "Quick weight log",
    frontPhotoUrl: null,
    sidePhotoUrl: null,
  };
}

const QuickLogHub = forwardRef<QuickLogHubHandle, QuickLogHubProps>(function QuickLogHub(
  { origin, latestCheckin, currentWeightKg = null, defaultMealDate, showLauncher = true, onSaved },
  ref,
) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("meal");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [aiEntitled, setAiEntitled] = useState(false);

  useEffect(() => {
    const checkAiEntitlement = async () => {
      try {
        const data = await fetchAuthMe();
        setAiEntitled(hasAiEntitlement(data));
      } catch {
        setAiEntitled(false);
      }
    };
    void checkAiEntitlement();
  }, []);

  const [mealDate, setMealDate] = useState(defaultMealDate ?? toTodayKey());
  const [mealTitle, setMealTitle] = useState("");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [mealCalories, setMealCalories] = useState(420);
  const [mealProtein, setMealProtein] = useState(28);
  const [mealCarbs, setMealCarbs] = useState(45);
  const [mealFats, setMealFats] = useState(12);
  const [mealQuantity, setMealQuantity] = useState(1);
  const [mealPhotoUrl, setMealPhotoUrl] = useState<string | null>(null);
  const [mealPhotoName, setMealPhotoName] = useState<string | null>(null);
  const [mealPhotoError, setMealPhotoError] = useState<string | null>(null);
  const [isMealPhotoProcessing, setIsMealPhotoProcessing] = useState(false);
  const [isMealPhotoAnalyzing, setIsMealPhotoAnalyzing] = useState(false);
  const [mealDetectedItems, setMealDetectedItems] = useState<
    Array<{ name: string; quantity?: number; unit?: string; calories: number; protein: number; carbs: number; fats: number }>
  >([]);
  const [mealAnalysisNotes, setMealAnalysisNotes] = useState<string | null>(null);

  const [waterDate, setWaterDate] = useState(toTodayKey());
  const [waterMl, setWaterMl] = useState(250);

  const [weightDate, setWeightDate] = useState(toTodayKey());
  const [weightKg, setWeightKg] = useState(Number(latestCheckin?.weightKg ?? currentWeightKg ?? 75));

  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceDraftNeedsConfirmation, setVoiceDraftNeedsConfirmation] =
    useState(false);
  const hasCapturedTranscriptRef = useRef(false);

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<QuickLogFoodItem | null>(null);

  const mealDayLabel = useMemo(() => {
    const parsedDate = parseDate(mealDate);
    if (!parsedDate) return "";
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(parsedDate);
    } catch {
      return mealDate;
    }
  }, [locale, mealDate]);

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const supportsSpeech = useMemo(() => {
    if (typeof window === "undefined") return false;
    const maybeCtor = (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    return typeof maybeCtor === "function";
  }, []);

  const openHub = useCallback((nextMode: Mode = "meal") => {
    setStatus(null);
    setMode(nextMode);
    setMealDate(defaultMealDate ?? toTodayKey());
    setOpen(true);
    trackEvent("quick_log_opened", { target: "nutrition", origin });
  }, [defaultMealDate, origin]);

  useImperativeHandle(ref, () => ({
    open: (nextMode: Mode = "meal") => {
      openHub(nextMode);
    },
  }));

  const closeHub = useCallback(() => {
    setOpen(false);
    setIsListening(false);
    recognitionRef.current?.stop();
    setVoiceDraftNeedsConfirmation(false);
    hasCapturedTranscriptRef.current = false;
  }, []);

  const resolveVoiceErrorMessage = (errorCode?: string) => {
    if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
      return t("quickLog.voicePermissionDenied");
    }
    if (errorCode === "no-speech" || errorCode === "audio-capture") {
      return t("quickLog.voiceNoSpeech");
    }
    if (errorCode === "network") {
      return t("quickLog.voiceNetworkError");
    }
    return t("quickLog.voiceGenericError");
  };

  const handleVoiceStart = () => {
    if (typeof window === "undefined") return;
    const Ctor = (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!Ctor) {
      setStatus({ type: "error", message: t("quickLog.voiceUnsupported") });
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    hasCapturedTranscriptRef.current = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results ?? [])
        .flatMap((result) => Array.from(result ?? []))
        .map((alternative) => alternative.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        hasCapturedTranscriptRef.current = true;
        setVoiceText(transcript);
        setStatus({ type: "success", message: t("quickLog.voiceCaptured") });
      }
    };
    recognition.onerror = (event) => {
      setStatus({ type: "error", message: resolveVoiceErrorMessage(event.error) });
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (!hasCapturedTranscriptRef.current) {
        setStatus({ type: "error", message: t("quickLog.voiceTranscriptEmpty") });
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const normalizeMealType = (value: string): "breakfast" | "lunch" | "dinner" | "snack" => {
    const normalized = value.toLowerCase();
    if (normalized.includes("breakfast") || normalized.includes("desayuno") || normalized.includes("pequeno-almoco")) return "breakfast";
    if (normalized.includes("lunch") || normalized.includes("almuerzo") || normalized.includes("almoco")) return "lunch";
    if (normalized.includes("dinner") || normalized.includes("cena") || normalized.includes("jantar")) return "dinner";
    return "snack";
  };

  const applyVoiceDraft = () => {
    if (!voiceText.trim()) {
      setStatus({ type: "error", message: t("quickLog.voiceTranscriptEmpty") });
      return;
    }
    const parsed = parseQuickVoiceMeal(voiceText);
    setMealTitle(parsed.title);
    setMealType(normalizeMealType(parsed.mealType));
    setMealCalories(parsed.calories);
    setMealProtein(parsed.protein);
    setMealCarbs(parsed.carbs);
    setMealFats(parsed.fats);
    trackEvent("voice_log_used", { target: "nutrition", origin });
    setVoiceDraftNeedsConfirmation(true);
    setStatus({ type: "success", message: t("quickLog.voiceDraftReady") });
  };

  const confirmVoiceDraft = () => {
    setVoiceDraftNeedsConfirmation(false);
    setStatus({ type: "success", message: t("quickLog.voiceDraftConfirmed") });
  };

  const handleMealPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMealPhotoError(null);
    setIsMealPhotoProcessing(true);
    try {
      const compressed = await compressAvatarToDataUrl(file);
      setMealPhotoUrl(compressed);
      setMealPhotoName(file.name);
      setMealDetectedItems([]);
      setMealAnalysisNotes(null);
      setStatus({ type: "success", message: t("quickLog.mealPhotoReady") });
    } catch {
      setMealPhotoUrl(null);
      setMealPhotoName(null);
      setMealPhotoError(t("quickLog.mealPhotoError"));
    } finally {
      setIsMealPhotoProcessing(false);
      event.target.value = "";
    }
  };

  const clearMealPhoto = () => {
    setMealPhotoUrl(null);
    setMealPhotoName(null);
    setMealPhotoError(null);
    setMealDetectedItems([]);
    setMealAnalysisNotes(null);
  };

  const resolveMealPhotoAnalyzeError = (error: unknown) => {
    if (error instanceof MealPhotoAnalysisError) {
      if (error.code === "LOW_CONFIDENCE") return t("quickLog.mealPhotoAnalyzeLowConfidence");
      if (error.code === "INVALID_IMAGE" || error.code === "INVALID_INPUT") return t("quickLog.mealPhotoAnalyzeInvalidImage");
      if (error.code === "AI_TIMEOUT") return t("quickLog.mealPhotoAnalyzeTimeout");
      if (
        error.code === "AI_ACCESS_FORBIDDEN"
        || error.code === "UPGRADE_REQUIRED"
        || error.code === "AI_TOKENS_EXHAUSTED"
        || error.code === "AI_TOKENS_INSUFFICIENT"
        || error.code === "AI_LIMIT_REACHED"
        || error.code === "AI_QUOTA_EXCEEDED"
      ) {
        return t("quickLog.mealPhotoAnalyzeUnavailable");
      }
      if (error.code === "AI_NOT_CONFIGURED" || error.code === "AI_SERVICE_UNAVAILABLE") return t("quickLog.mealPhotoAnalyzeUnavailable");
    }
    return t("quickLog.mealPhotoAnalyzeError");
  };

  const handleMealPhotoAnalyze = async () => {
    if (!mealPhotoUrl) {
      setStatus({ type: "error", message: t("quickLog.mealPhotoAnalyzeMissing") });
      return;
    }

    setIsMealPhotoAnalyzing(true);
    setStatus(null);
    trackEvent("quick_log_photo_analysis_started", { origin, target: "nutrition" });

    try {
      const result = await analyzeMealPhoto({ photoDataUrl: mealPhotoUrl, locale });
      setMealTitle(result.title);
      setMealCalories(result.totals.calories);
      setMealProtein(result.totals.protein);
      setMealCarbs(result.totals.carbs);
      setMealFats(result.totals.fats);
      setMealDetectedItems(result.items);
      setMealAnalysisNotes(result.notes ?? null);
      setStatus({ type: "success", message: t("quickLog.mealPhotoAnalyzeSuccess") });
      trackEvent("quick_log_photo_analysis_success", {
        origin,
        target: "nutrition",
        confidence: result.confidence,
        itemsCount: result.items.length,
      });
    } catch (error) {
      const message = resolveMealPhotoAnalyzeError(error);
      setStatus({ type: "error", message });
      trackEvent("quick_log_photo_analysis_error", {
        origin,
        target: "nutrition",
        code: error instanceof MealPhotoAnalysisError ? error.code : "UNKNOWN",
      });
    } finally {
      setIsMealPhotoAnalyzing(false);
    }
  };

  const applyLookup = () => {
    const barcodeMatch = findQuickLogFoodByBarcode(lookupQuery);
    const firstTextMatch = searchQuickLogFoods(lookupQuery, 1)[0] ?? null;
    const match = barcodeMatch ?? firstTextMatch;

    setLookupResult(match);
    trackEvent("barcode_lookup_used", { target: "nutrition", origin });

    if (!match) {
      setStatus({ type: "error", message: t("quickLog.lookupNoMatch") });
      return;
    }

    setMealTitle(match.name);
    setMealCalories(match.per100.calories);
    setMealProtein(match.per100.protein);
    setMealCarbs(match.per100.carbs);
    setMealFats(match.per100.fats);
    setStatus({ type: "success", message: t("quickLog.lookupApplied") });
  };

  const notifySaved = async (payload: { mode: Mode; date?: string; mealType?: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" }) => {
    trackEvent("quick_log_saved", { target: mode === "weight" ? "checkin" : "nutrition", origin, mode: "quick" });
    void sendRctEvent({
      event: "logging_entry_created",
      context: { origin, mode, target: mode === "weight" ? "checkin" : "nutrition" },
    });
    if (typeof window !== "undefined" && payload.mode === "meal" && payload.date && payload.mealType) {
      window.dispatchEvent(
        new CustomEvent(NUTRITION_ADHERENCE_EVENT, {
          detail: {
            dateKey: payload.date,
            mealType: payload.mealType,
            title: mealTitle.trim() || t("quickLog.defaultMealTitle"),
          },
        }),
      );
    }
    if (onSaved) {
      await onSaved(payload);
    }
  };

  const saveMeal = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      // Create in backend via BFF (NEW: persist data)
      const mealParams: CreateMealParams = {
        date: mealDate,
        mealType: mapMealType(mealType),
        title: mealTitle.trim() || t("quickLog.defaultMealTitle"),
        calories: Math.max(0, Math.round(mealCalories)),
        protein: Math.max(0, Math.round(mealProtein)),
        carbs: Math.max(0, Math.round(mealCarbs)),
        fats: Math.max(0, Math.round(mealFats)),
        items:
          mealDetectedItems.length > 0
            ? mealDetectedItems.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                calories: Math.max(0, Math.round(item.calories)),
                protein: Math.max(0, Math.round(item.protein)),
                carbs: Math.max(0, Math.round(item.carbs)),
                fats: Math.max(0, Math.round(item.fats)),
                photoUrl: mealPhotoUrl ?? undefined,
              }))
            : [
                {
                  name: mealTitle.trim() || t("quickLog.defaultMealItemName"),
                  quantity: Math.max(0.25, Number(mealQuantity) || 1),
                  unit: "serving",
                  calories: Math.max(0, Math.round(mealCalories)),
                  protein: Math.max(0, Math.round(mealProtein)),
                  carbs: Math.max(0, Math.round(mealCarbs)),
                  fats: Math.max(0, Math.round(mealFats)),
                  photoUrl: mealPhotoUrl ?? undefined,
                },
              ],
      };
      
      const createdMeal = await createMealLog(mealParams);
      if (createdMeal.id && !createdMeal.completedAt) {
        try {
          await completeMeal(createdMeal.id);
        } catch {
          await updateMealLog(createdMeal.id, { completed: true }).catch(() => undefined);
        }
      }
      const apiMealType = mapMealType(mealType);
      await notifySaved({ mode: "meal", date: mealDate, mealType: apiMealType });
      setStatus({ type: "success", message: t("quickLog.mealSaved") });
      setMealTitle("");
      setMealQuantity(1);
      setMealDetectedItems([]);
      setMealAnalysisNotes(null);
      clearMealPhoto();
      setVoiceDraftNeedsConfirmation(false);
    } catch (err) {
      console.error("Failed to save meal to backend:", err);
      setStatus({ type: "error", message: t("quickLog.mealSaveFallback") });
      // Fallback: save locally anyway so user doesn't lose data
      try {
        const entry = mealEntryFromDraft({
          date: mealDate,
          title: mealTitle,
          mealType,
          calories: mealCalories,
          protein: mealProtein,
          carbs: mealCarbs,
          fats: mealFats,
        });
        await createTrackingEntry("mealLog", entry);
        await notifySaved({ mode: "meal", date: mealDate, mealType: mapMealType(mealType) });
        setStatus({ type: "success", message: t("quickLog.mealSavedOffline") });
        setMealTitle("");
        setMealQuantity(1);
        setMealDetectedItems([]);
        setMealAnalysisNotes(null);
        clearMealPhoto();
        setVoiceDraftNeedsConfirmation(false);
      } catch {
        setStatus({ type: "error", message: t("quickLog.mealSaveError") });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to map meal type string to API enum
  function mapMealType(type: "breakfast" | "lunch" | "dinner" | "snack"): "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" {
    if (type === "breakfast") return "BREAKFAST";
    if (type === "lunch") return "LUNCH";
    if (type === "dinner") return "DINNER";
    return "SNACK";
  }

  const saveWater = async () => {
    const safeMl = Math.max(50, Math.min(1500, Math.round(waterMl)));
    setIsSaving(true);
    setStatus(null);
    try {
      await createTrackingEntry("foodLog", {
        id: `${waterDate}-${Date.now()}-water`,
        date: waterDate,
        foodKey: "water",
        grams: safeMl,
      });
      await notifySaved({ mode: "water", date: waterDate });
      setStatus({ type: "success", message: t("quickLog.waterSaved", { amount: safeMl }) });
      setWaterMl(250);
    } catch {
      setStatus({ type: "error", message: t("quickLog.waterSaveError") });
    } finally {
      setIsSaving(false);
    }
  };

  const saveWeight = async () => {
    const safeWeight = Number(weightKg);
    if (!Number.isFinite(safeWeight) || safeWeight < 30 || safeWeight > 260) {
      setStatus({ type: "error", message: t("quickLog.weightRangeError") });
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      await createTrackingEntry("checkins", checkinFromWeight(weightDate, safeWeight, latestCheckin));
      await notifySaved({ mode: "weight", date: weightDate });
      setStatus({ type: "success", message: t("quickLog.weightSaved") });
    } catch {
      setStatus({ type: "error", message: t("quickLog.weightSaveError") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.launcher}>
      {showLauncher ? (
        <Button className={styles.launcherButton} variant="secondary" onClick={() => openHub()}>
          {t("quickLog.launcher")}
        </Button>
      ) : null}

      <Modal
        open={open}
        onClose={closeHub}
        title={t("quickLog.modalTitle")}
        description={t("quickLog.modalDescription")}
        className={`${styles.sheet} today-premium-modal`}
      >
        <div className={styles.modeRow}>
          <button type="button" className={`${styles.modeButton} ${mode === "meal" ? styles.modeButtonActive : ""}`} onClick={() => setMode("meal")}>
            {t("quickLog.modeMeal")}
          </button>
          <button type="button" className={`${styles.modeButton} ${mode === "water" ? styles.modeButtonActive : ""}`} onClick={() => setMode("water")}>
            {t("quickLog.modeWater")}
          </button>
          <button type="button" className={`${styles.modeButton} ${mode === "weight" ? styles.modeButtonActive : ""}`} onClick={() => setMode("weight")}>
            {t("quickLog.modeWeight")}
          </button>
        </div>

        {mode === "meal" ? (
          <div className={styles.grid}>
            <Input label={t("quickLog.fieldDate")} type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} />
            <Input label={t("quickLog.fieldMealTitle")} placeholder={t("quickLog.fieldMealPlaceholder")} value={mealTitle} onChange={(event) => setMealTitle(event.target.value)} />

            <div className={styles.fieldRow}>
              <label className={styles.selectField}>
                <span>{t("quickLog.fieldMealType")}</span>
                <select
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value as "breakfast" | "lunch" | "dinner" | "snack")}
                >
                  <option value="breakfast">{t("quickLog.mealTypeBreakfast")}</option>
                  <option value="lunch">{t("quickLog.mealTypeLunch")}</option>
                  <option value="dinner">{t("quickLog.mealTypeDinner")}</option>
                  <option value="snack">{t("quickLog.mealTypeSnack")}</option>
                </select>
              </label>
              <Input label={t("quickLog.fieldLookup")} placeholder={t("quickLog.lookupPlaceholder")} value={lookupQuery} onChange={(event) => setLookupQuery(event.target.value)} />
            </div>

            <div className={styles.fieldRow}>
              <Input label={t("quickLog.fieldQuantity")} type="number" min={0.25} step={0.25} value={mealQuantity} onChange={(event) => setMealQuantity(Number(event.target.value))} />
              <label className={styles.uploadField}>
                <span>{t("quickLog.mealPhotoLabel")}</span>
                <input type="file" accept="image/*" capture="environment" onChange={(event) => void handleMealPhotoChange(event)} />
              </label>
            </div>

            {mealPhotoError ? <p className={`${styles.status} ${styles.statusError}`}>{mealPhotoError}</p> : null}
            {isMealPhotoProcessing ? <p className={styles.smallText}>{t("quickLog.mealPhotoProcessing")}</p> : null}
            {mealPhotoUrl ? (
              <div className={styles.photoPreviewCard}>
                <img src={mealPhotoUrl} alt={t("quickLog.mealPhotoAlt")} className={styles.photoPreview} />
                <div className={styles.photoPreviewMeta}>
                  <p className={styles.smallText}>{mealPhotoName ?? t("quickLog.mealPhotoReady")}</p>
                  {!aiEntitled ? (
                    <div className={styles.lookupResult}>
                      <p className={styles.smallText} style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                        {t("pro.aiLockedSubtitle") || "Desbloquea con Pro"}
                      </p>
                      <Button type="button" variant="primary" onClick={() => (window.location.href = "/app/settings/billing")}>
                        {t("pro.aiLockedCta") || "Hazte Pro"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button type="button" variant="secondary" onClick={() => void handleMealPhotoAnalyze()} loading={isMealPhotoAnalyzing}>
                        {t("quickLog.mealPhotoAnalyze")}
                      </Button>
                      <Button type="button" variant="ghost" onClick={clearMealPhoto}>{t("quickLog.removePhoto")}</Button>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {mealDetectedItems.length > 0 ? (
              <div className={styles.lookupResult}>
                <strong>{t("quickLog.mealPhotoDetectedItems")}</strong>
                {mealDetectedItems.map((item, index) => (
                  <p key={`${item.name}-${index}`} className={styles.smallText}>
                    {item.name} - {item.calories} kcal, P {item.protein}g, C {item.carbs}g, G {item.fats}g
                  </p>
                ))}
                {mealAnalysisNotes ? <p className={styles.smallText}>{mealAnalysisNotes}</p> : null}
              </div>
            ) : null}

            <div className={styles.voiceActions}>
              <Button variant="ghost" onClick={handleVoiceStart} disabled={isListening || !supportsSpeech}>
                {isListening ? t("quickLog.voiceListening") : t("quickLog.voiceStart")}
              </Button>
              <Button variant="ghost" onClick={applyVoiceDraft} disabled={!voiceText.trim()}>
                {t("quickLog.voiceApply")}
              </Button>
              <Button variant="ghost" onClick={confirmVoiceDraft} disabled={!voiceDraftNeedsConfirmation}>
                {t("quickLog.voiceConfirm")}
              </Button>
              <Button variant="ghost" onClick={applyLookup} disabled={!lookupQuery.trim()}>
                {t("quickLog.lookupApply")}
              </Button>
            </div>

            <textarea
              className={styles.transcript}
              value={voiceText}
              onChange={(event) => setVoiceText(event.target.value)}
              placeholder={t("quickLog.voicePlaceholder")}
            />

            {voiceDraftNeedsConfirmation ? <p className={styles.smallText}>{t("quickLog.voiceNeedsConfirmation")}</p> : null}

            {lookupResult ? (
              <div className={styles.lookupResult}>
                <strong>{lookupResult.name}</strong>
                <p className={styles.smallText}>100g: {lookupResult.per100.calories} kcal, P {lookupResult.per100.protein}g, C {lookupResult.per100.carbs}g, G {lookupResult.per100.fats}g</p>
              </div>
            ) : null}

            <div className={styles.fieldRow}>
              <Input label="kcal" type="number" value={mealCalories} onChange={(event) => setMealCalories(Number(event.target.value))} />
              <Input label={t("quickLog.fieldProtein")} type="number" value={mealProtein} onChange={(event) => setMealProtein(Number(event.target.value))} />
            </div>
            <div className={styles.fieldRow}>
              <Input label={t("quickLog.fieldCarbs")} type="number" value={mealCarbs} onChange={(event) => setMealCarbs(Number(event.target.value))} />
              <Input label={t("quickLog.fieldFats")} type="number" value={mealFats} onChange={(event) => setMealFats(Number(event.target.value))} />
            </div>

            {mealDetectedItems.length > 0 ? (
              <div className={styles.reviewBlock}>
                <div>
                  <p className={styles.reviewTitle}>{t("quickLog.reviewTitle")}</p>
                  <p className={styles.smallText}>{t("quickLog.reviewHint")}</p>
                  {mealDayLabel ? (
                    <p className={styles.smallText}>{t("quickLog.reviewSelectedDay", { day: mealDayLabel })}</p>
                  ) : null}
                </div>
                <div className={styles.fieldRow}>
                  <Input
                    label={t("quickLog.fieldDate")}
                    type="date"
                    value={mealDate}
                    onChange={(event) => setMealDate(event.target.value)}
                  />
                  <label className={styles.selectField}>
                    <span>{t("quickLog.fieldMealType")}</span>
                    <select
                      value={mealType}
                      onChange={(event) =>
                        setMealType(
                          event.target.value as
                            | "breakfast"
                            | "lunch"
                            | "dinner"
                            | "snack",
                        )
                      }
                    >
                      <option value="breakfast">{t("quickLog.mealTypeBreakfast")}</option>
                      <option value="lunch">{t("quickLog.mealTypeLunch")}</option>
                      <option value="dinner">{t("quickLog.mealTypeDinner")}</option>
                      <option value="snack">{t("quickLog.mealTypeSnack")}</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            <Button className={styles.saveButton} onClick={() => void saveMeal()} loading={isSaving} disabled={voiceDraftNeedsConfirmation}>
              {t("quickLog.saveMeal")}
            </Button>
          </div>
        ) : null}

        {mode === "water" ? (
          <div className={styles.grid}>
            <Input label={t("quickLog.fieldDate")} type="date" value={waterDate} onChange={(event) => setWaterDate(event.target.value)} />
            <Input label={t("quickLog.fieldWaterMl")} type="number" value={waterMl} onChange={(event) => setWaterMl(Number(event.target.value))} helperText={t("quickLog.waterTip")} />
            <div className={styles.voiceActions}>
              <Button variant="secondary" onClick={() => setWaterMl(250)}>+250 ml</Button>
              <Button variant="secondary" onClick={() => setWaterMl(500)}>+500 ml</Button>
            </div>
            <Button className={styles.saveButton} onClick={() => void saveWater()} loading={isSaving}>
              {t("quickLog.saveWater")}
            </Button>
          </div>
        ) : null}

        {mode === "weight" ? (
          <div className={styles.grid}>
            <Input label={t("quickLog.fieldDate")} type="date" value={weightDate} onChange={(event) => setWeightDate(event.target.value)} />
            <Input label={t("quickLog.fieldWeightKg")} type="number" step="0.1" value={weightKg} onChange={(event) => setWeightKg(Number(event.target.value))} />
            <Button className={styles.saveButton} onClick={() => void saveWeight()} loading={isSaving}>
              {t("quickLog.saveWeight")}
            </Button>
          </div>
        ) : null}

        {status ? (
          <p className={`${styles.status} ${status.type === "success" ? styles.statusSuccess : styles.statusError}`} role="status" aria-live="polite">
            {status.message}
          </p>
        ) : null}
      </Modal>
    </div>
  );
});

export default QuickLogHub;
