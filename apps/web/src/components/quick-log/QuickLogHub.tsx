"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { trackEvent } from "@/lib/analytics";
import { findQuickLogFoodByBarcode, searchQuickLogFoods, type QuickLogFoodItem } from "@/lib/quickLogFoodCatalog";
import { parseQuickVoiceMeal } from "@/lib/quickLogVoiceParser";
import { createTrackingEntry, type CheckinEntry, type MealLogEntry } from "@/services/tracking";
import styles from "./QuickLogHub.module.css";

type Mode = "meal" | "water" | "weight";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type QuickLogHubProps = {
  origin: "today" | "nutrition";
  latestCheckin: CheckinEntry | null;
  currentWeightKg?: number | null;
  onSaved?: () => Promise<void> | void;
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
    title: args.title.trim() || "Comida rápida",
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

export default function QuickLogHub({ origin, latestCheckin, currentWeightKg = null, onSaved }: QuickLogHubProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("meal");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [mealDate, setMealDate] = useState(toTodayKey());
  const [mealTitle, setMealTitle] = useState("");
  const [mealType, setMealType] = useState("meal");
  const [mealCalories, setMealCalories] = useState(420);
  const [mealProtein, setMealProtein] = useState(28);
  const [mealCarbs, setMealCarbs] = useState(45);
  const [mealFats, setMealFats] = useState(12);

  const [waterDate, setWaterDate] = useState(toTodayKey());
  const [waterMl, setWaterMl] = useState(250);

  const [weightDate, setWeightDate] = useState(toTodayKey());
  const [weightKg, setWeightKg] = useState(Number(latestCheckin?.weightKg ?? currentWeightKg ?? 75));

  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<QuickLogFoodItem | null>(null);

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const supportsSpeech = useMemo(() => {
    if (typeof window === "undefined") return false;
    const maybeCtor = (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    return typeof maybeCtor === "function";
  }, []);

  const openHub = () => {
    setStatus(null);
    setOpen(true);
    trackEvent("quick_log_opened", { target: "nutrition", origin });
  };

  const closeHub = () => {
    setOpen(false);
    setIsListening(false);
    recognitionRef.current?.stop();
  };

  const handleVoiceStart = () => {
    if (typeof window === "undefined") return;
    const Ctor = (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!Ctor) {
      setStatus({ type: "error", message: "Tu navegador no soporta voz. Puedes pegar texto manualmente." });
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        setVoiceText(transcript.trim());
      }
    };
    recognition.onerror = () => {
      setStatus({ type: "error", message: "No pudimos capturar la voz. Prueba pegar el texto." });
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const applyVoiceDraft = () => {
    const parsed = parseQuickVoiceMeal(voiceText);
    setMealTitle(parsed.title);
    setMealType(parsed.mealType);
    setMealCalories(parsed.calories);
    setMealProtein(parsed.protein);
    setMealCarbs(parsed.carbs);
    setMealFats(parsed.fats);
    trackEvent("voice_log_used", { target: "nutrition", origin });
    setStatus({ type: "success", message: "Propuesta creada desde voz. Puedes editarla antes de guardar." });
  };

  const applyLookup = () => {
    const barcodeMatch = findQuickLogFoodByBarcode(lookupQuery);
    const firstTextMatch = searchQuickLogFoods(lookupQuery, 1)[0] ?? null;
    const match = barcodeMatch ?? firstTextMatch;

    setLookupResult(match);
    trackEvent("barcode_lookup_used", { target: "nutrition", origin });

    if (!match) {
      setStatus({ type: "error", message: "Sin coincidencias. Prueba otro codigo o nombre." });
      return;
    }

    setMealTitle(match.name);
    setMealCalories(match.per100.calories);
    setMealProtein(match.per100.protein);
    setMealCarbs(match.per100.carbs);
    setMealFats(match.per100.fats);
    setStatus({ type: "success", message: "Macros prellenadas desde lookup." });
  };

  const notifySaved = async () => {
    trackEvent("quick_log_saved", { target: mode === "weight" ? "checkin" : "nutrition", origin, mode: "quick" });
    if (onSaved) {
      await onSaved();
    }
  };

  const saveMeal = async () => {
    setIsSaving(true);
    setStatus(null);
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
      await notifySaved();
      setStatus({ type: "success", message: "Comida guardada." });
      setMealTitle("");
    } catch {
      setStatus({ type: "error", message: "No pudimos guardar la comida." });
    } finally {
      setIsSaving(false);
    }
  };

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
      await notifySaved();
      setStatus({ type: "success", message: `${safeMl} ml de agua guardados.` });
      setWaterMl(250);
    } catch {
      setStatus({ type: "error", message: "No pudimos guardar el agua." });
    } finally {
      setIsSaving(false);
    }
  };

  const saveWeight = async () => {
    const safeWeight = Number(weightKg);
    if (!Number.isFinite(safeWeight) || safeWeight < 30 || safeWeight > 260) {
      setStatus({ type: "error", message: "El peso debe estar entre 30 y 260 kg." });
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      await createTrackingEntry("checkins", checkinFromWeight(weightDate, safeWeight, latestCheckin));
      await notifySaved();
      setStatus({ type: "success", message: "Peso guardado correctamente." });
    } catch {
      setStatus({ type: "error", message: "No pudimos guardar el peso." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.launcher}>
      <Button className={styles.launcherButton} variant="secondary" onClick={openHub}>
        Quick log
      </Button>

      <Modal
        open={open}
        onClose={closeHub}
        title="Quick logging"
        description="Registra comida, agua o peso en segundos."
        className={`${styles.sheet} today-premium-modal`}
      >
        <div className={styles.modeRow}>
          <button type="button" className={`${styles.modeButton} ${mode === "meal" ? styles.modeButtonActive : ""}`} onClick={() => setMode("meal")}>
            Comida
          </button>
          <button type="button" className={`${styles.modeButton} ${mode === "water" ? styles.modeButtonActive : ""}`} onClick={() => setMode("water")}>
            Agua
          </button>
          <button type="button" className={`${styles.modeButton} ${mode === "weight" ? styles.modeButtonActive : ""}`} onClick={() => setMode("weight")}>
            Peso
          </button>
        </div>

        {mode === "meal" ? (
          <div className={styles.grid}>
            <Input label="Fecha" type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} />
            <Input label="Comida" placeholder="Ej: pollo y arroz" value={mealTitle} onChange={(event) => setMealTitle(event.target.value)} />

            <div className={styles.fieldRow}>
              <Input label="Tipo" value={mealType} onChange={(event) => setMealType(event.target.value)} />
              <Input label="Lookup" placeholder="Codigo o alimento" value={lookupQuery} onChange={(event) => setLookupQuery(event.target.value)} />
            </div>

            <div className={styles.voiceActions}>
              <Button variant="ghost" onClick={handleVoiceStart} disabled={isListening || !supportsSpeech}>
                {isListening ? "Escuchando..." : "Usar voz"}
              </Button>
              <Button variant="ghost" onClick={applyVoiceDraft} disabled={!voiceText.trim()}>
                Aplicar texto
              </Button>
              <Button variant="ghost" onClick={applyLookup} disabled={!lookupQuery.trim()}>
                Buscar
              </Button>
            </div>

            <textarea
              className={styles.transcript}
              value={voiceText}
              onChange={(event) => setVoiceText(event.target.value)}
              placeholder='Ej: "Comi 200g pollo y arroz"'
            />

            {lookupResult ? (
              <div className={styles.lookupResult}>
                <strong>{lookupResult.name}</strong>
                <p className={styles.smallText}>100g: {lookupResult.per100.calories} kcal, P {lookupResult.per100.protein}g, C {lookupResult.per100.carbs}g, G {lookupResult.per100.fats}g</p>
              </div>
            ) : null}

            <div className={styles.fieldRow}>
              <Input label="kcal" type="number" value={mealCalories} onChange={(event) => setMealCalories(Number(event.target.value))} />
              <Input label="Proteina" type="number" value={mealProtein} onChange={(event) => setMealProtein(Number(event.target.value))} />
            </div>
            <div className={styles.fieldRow}>
              <Input label="Carbohidratos" type="number" value={mealCarbs} onChange={(event) => setMealCarbs(Number(event.target.value))} />
              <Input label="Grasas" type="number" value={mealFats} onChange={(event) => setMealFats(Number(event.target.value))} />
            </div>

            <Button className={styles.saveButton} onClick={() => void saveMeal()} loading={isSaving}>
              Guardar comida
            </Button>
          </div>
        ) : null}

        {mode === "water" ? (
          <div className={styles.grid}>
            <Input label="Fecha" type="date" value={waterDate} onChange={(event) => setWaterDate(event.target.value)} />
            <Input label="Mililitros" type="number" value={waterMl} onChange={(event) => setWaterMl(Number(event.target.value))} helperText="Tip: usa 250ml para registrar con 1 toque." />
            <div className={styles.voiceActions}>
              <Button variant="secondary" onClick={() => setWaterMl(250)}>+250 ml</Button>
              <Button variant="secondary" onClick={() => setWaterMl(500)}>+500 ml</Button>
            </div>
            <Button className={styles.saveButton} onClick={() => void saveWater()} loading={isSaving}>
              Guardar agua
            </Button>
          </div>
        ) : null}

        {mode === "weight" ? (
          <div className={styles.grid}>
            <Input label="Fecha" type="date" value={weightDate} onChange={(event) => setWeightDate(event.target.value)} />
            <Input label="Peso (kg)" type="number" step="0.1" value={weightKg} onChange={(event) => setWeightKg(Number(event.target.value))} />
            <Button className={styles.saveButton} onClick={() => void saveWeight()} loading={isSaving}>
              Guardar peso
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
}
