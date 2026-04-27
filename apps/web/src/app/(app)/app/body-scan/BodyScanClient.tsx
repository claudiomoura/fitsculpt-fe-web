"use client";

import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { hasAiEntitlement } from "@/domains/ai";
import { fetchAuthMe } from "@/lib/authDedup";
import { compressAvatarToDataUrl } from "@/lib/avatarUpload";
import {
  analyzeTrackingBodyFatScan,
  type BodyFatScanExecutionResult,
} from "@/services/trackingBodyFatScan";
import styles from "./BodyScanClient.module.css";

type FlowStep = "intro" | "front" | "side" | "review" | "analyzing" | "result" | "error";

const ESTIMATED_BODY_SCAN_TOKENS = 260;

function formatConfidence(confidence: BodyFatScanExecutionResult["confidence"]): string {
  if (confidence === "high") return "Alta";
  if (confidence === "medium") return "Media";
  return "Baja";
}

function hasValidResult(result: BodyFatScanExecutionResult | null): result is BodyFatScanExecutionResult {
  return Boolean(result?.status === "completed" && result.estimate && result.estimate.pointPercent > 0);
}

export default function BodyScanClient() {
  const [step, setStep] = useState<FlowStep>("intro");
  const [frontPhotoDataUrl, setFrontPhotoDataUrl] = useState<string | null>(null);
  const [sidePhotoDataUrl, setSidePhotoDataUrl] = useState<string | null>(null);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(true);
  const [isProEligible, setIsProEligible] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [result, setResult] = useState<BodyFatScanExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadEntitlements = async () => {
      try {
        const profile = await fetchAuthMe();
        if (!active) return;
        setIsProEligible(hasAiEntitlement(profile));
        setTokenBalance(typeof profile.aiTokenBalance === "number" ? profile.aiTokenBalance : null);
      } catch (_error) {
        if (!active) return;
        setIsProEligible(false);
        setTokenBalance(null);
      } finally {
        if (active) setIsEntitlementLoading(false);
      }
    };
    void loadEntitlements();
    return () => {
      active = false;
    };
  }, []);

  const isTokenBlocked = typeof tokenBalance === "number" && tokenBalance < ESTIMATED_BODY_SCAN_TOKENS;
  const canAnalyze = Boolean(frontPhotoDataUrl && sidePhotoDataUrl && isProEligible && !isTokenBlocked);

  async function handlePhotoUpload(kind: "front" | "side", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setIsPhotoProcessing(true);
    try {
      const dataUrl = await compressAvatarToDataUrl(file);
      if (kind === "front") {
        setFrontPhotoDataUrl(dataUrl);
        setStep(sidePhotoDataUrl ? "review" : "side");
      } else {
        setSidePhotoDataUrl(dataUrl);
        setStep(frontPhotoDataUrl ? "review" : "front");
      }
    } catch (_error) {
      setPhotoError("No pudimos procesar la imagen. Usa una foto JPG, PNG o WEBP menor a 10 MB.");
    } finally {
      setIsPhotoProcessing(false);
    }
  }

  async function analyze() {
    if (!frontPhotoDataUrl || !sidePhotoDataUrl) {
      setErrorMessage("Necesitas subir foto frontal y lateral antes de analizar.");
      setStep("error");
      return;
    }
    if (!isProEligible || isTokenBlocked) {
      setErrorMessage("Tu plan o saldo de tokens no permite ejecutar este scan ahora.");
      setStep("error");
      return;
    }

    setStep("analyzing");
    setErrorMessage(null);
    setResult(null);

    const response = await analyzeTrackingBodyFatScan({
      frontPhotoDataUrl,
      sidePhotoDataUrl,
      locale: "es",
    });

    if (!response.ok || !hasValidResult(response.data)) {
      setErrorMessage(
        response.ok
          ? response.data.errorMessage ?? "No pudimos generar una estimacion valida. Repite el scan."
          : "Error al ejecutar el scan. Intentalo de nuevo en unos minutos.",
      );
      setResult(response.ok ? response.data : null);
      setStep("error");
      return;
    }

    setResult(response.data);
    setTokenBalance(response.data.usage.balanceAfter ?? tokenBalance);
    setStep("result");
  }

  function retry() {
    setResult(null);
    setErrorMessage(null);
    setStep(frontPhotoDataUrl && sidePhotoDataUrl ? "review" : frontPhotoDataUrl ? "side" : "front");
  }

  function resetPhotos() {
    setFrontPhotoDataUrl(null);
    setSidePhotoDataUrl(null);
    setResult(null);
    setErrorMessage(null);
    setStep("front");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Escaneo Corporal IA</p>
          <h1>Estima tu porcentaje graso con dos fotos guiadas.</h1>
          <p>
            Un flujo independiente para capturar foto frontal y lateral, revisar calidad y ejecutar el analisis sin pasar por Tracking.
          </p>
        </div>
        <div className={styles.tokenCard}>
          <span>PRO / Tokens</span>
          <strong>{isEntitlementLoading ? "Cargando..." : isProEligible ? "Disponible" : "Requiere PRO"}</strong>
          <small>
            {typeof tokenBalance === "number"
              ? `${tokenBalance} tokens disponibles · est. ${ESTIMATED_BODY_SCAN_TOKENS}`
              : `Est. ${ESTIMATED_BODY_SCAN_TOKENS} tokens`}
          </small>
        </div>
      </section>

      {!isEntitlementLoading && !isProEligible ? (
        <section className={styles.notice}>
          <strong>Funcionalidad PRO</strong>
          <p>El scan usa IA y consume tokens. Actualiza tu plan para desbloquear analisis corporal avanzado.</p>
          <Link href="/app/settings/billing" className="btn primary fit-content">Desbloquear PRO</Link>
        </section>
      ) : null}

      {isProEligible && isTokenBlocked ? (
        <section className={styles.errorNotice} role="alert">
          <strong>Tokens insuficientes</strong>
          <p>Necesitas al menos {ESTIMATED_BODY_SCAN_TOKENS} tokens para ejecutar este scan.</p>
          <Link href="/app/settings/billing" className="btn secondary fit-content">Gestionar tokens</Link>
        </section>
      ) : null}

      <section className={styles.flowCard}>
        <ol className={styles.stepper} aria-label="Progreso del escaneo">
          {[
            ["intro", "Aprender"],
            ["front", "Frontal"],
            ["side", "Lateral"],
            ["review", "Revisar"],
            ["result", "Resultado"],
          ].map(([id, label]) => (
            <li key={id} className={step === id ? styles.activeStep : ""}>{label}</li>
          ))}
        </ol>

        {step === "intro" ? (
          <div className={styles.panel}>
            <h2>Antes de empezar</h2>
            <ul className={styles.checklist}>
              <li>Usa luz frontal y un fondo limpio.</li>
              <li>Coloca la camara a la altura del pecho y captura cuerpo completo.</li>
              <li>Evita poses flexionadas: postura neutral, abdomen relajado.</li>
              <li>El resultado es orientativo, no diagnostico medico ni medicion clinica.</li>
            </ul>
            <button type="button" className="btn primary" onClick={() => setStep("front")}>Comenzar captura</button>
          </div>
        ) : null}

        {step === "front" || step === "side" || step === "review" ? (
          <div className={styles.captureLayout}>
            <PhotoCard
              title="Foto frontal"
              body="Mirando al frente, brazos relajados y pies paralelos."
              previewUrl={frontPhotoDataUrl}
              buttonLabel={frontPhotoDataUrl ? "Repetir frontal" : "Subir frontal"}
              onChange={(event) => handlePhotoUpload("front", event)}
            />
            <PhotoCard
              title="Foto lateral"
              body="Gira 90 grados y conserva distancia y altura de camara."
              previewUrl={sidePhotoDataUrl}
              buttonLabel={sidePhotoDataUrl ? "Repetir lateral" : "Subir lateral"}
              onChange={(event) => handlePhotoUpload("side", event)}
            />
            <div className={styles.reviewPanel}>
              <h2>{frontPhotoDataUrl && sidePhotoDataUrl ? "Listo para analizar" : "Captura pendiente"}</h2>
              <p>
                {frontPhotoDataUrl && sidePhotoDataUrl
                  ? "Revisa que ambas fotos esten nitidas y ejecuta el analisis."
                  : "Sube las dos vistas para activar el analisis IA."}
              </p>
              {photoError ? <p className={styles.inlineError} role="alert">{photoError}</p> : null}
              {isPhotoProcessing ? <p className="muted">Procesando imagen...</p> : null}
              <div className={styles.actions}>
                <button type="button" className="btn primary" onClick={analyze} disabled={!canAnalyze || isPhotoProcessing}>
                  Analizar con IA
                </button>
                <button type="button" className="btn secondary" onClick={resetPhotos} disabled={isPhotoProcessing}>
                  Reiniciar fotos
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "analyzing" ? (
          <div className={styles.loadingPanel} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <h2>Analizando composicion corporal...</h2>
            <p>Esto puede tardar unos segundos mientras validamos calidad, postura y estimacion.</p>
          </div>
        ) : null}

        {step === "error" ? (
          <div className={styles.errorPanel} role="alert">
            <h2>No se pudo completar el scan</h2>
            <p>{errorMessage ?? "Revisa las fotos y vuelve a intentarlo."}</p>
            <div className={styles.actions}>
              <button type="button" className="btn primary" onClick={retry}>Reintentar</button>
              <button type="button" className="btn secondary" onClick={resetPhotos}>Cambiar fotos</button>
            </div>
          </div>
        ) : null}

        {step === "result" && hasValidResult(result) ? (
          <div className={styles.resultPanel}>
            {(() => {
              const estimate = result.estimate!;
              return (
                <>
            <p className={styles.eyebrow}>Resultado estimado</p>
            <div className={styles.resultHeader}>
              <div>
                <strong>{estimate.pointPercent.toFixed(1)}%</strong>
                <p className={styles.resultLead}>Tu estimación central actual de grasa corporal.</p>
              </div>
              <span>{estimate.range.min.toFixed(1)}% - {estimate.range.max.toFixed(1)}%</span>
            </div>
            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <span>Rango orientativo</span>
                <strong>{estimate.range.min.toFixed(1)}% - {estimate.range.max.toFixed(1)}%</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Confianza</span>
                <strong>{formatConfidence(result.confidence)}{typeof result.confidenceScore === "number" ? ` · ${result.confidenceScore}/100` : ""}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Uso de tokens</span>
                <strong>{result.usage.totalTokens ?? 0}</strong>
              </div>
            </div>
            <p>{result.summary}</p>
            {result.nextActions.length > 0 ? (
              <div className={styles.resultList}>
                <strong>Siguiente mejor acción</strong>
                {result.nextActions.slice(0, 3).map((item, index) => <p key={`next-${index}`}>{item}</p>)}
              </div>
            ) : null}
            {result.limitations.length > 0 ? (
              <div className={styles.resultList}>
                <strong>Qué limita la precisión</strong>
                {result.limitations.slice(0, 3).map((item, index) => <p key={`limit-${index}`}>{item}</p>)}
              </div>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className="btn primary" onClick={resetPhotos}>Nuevo scan</button>
              <Link href="/app/seguimiento" className="btn secondary">Ver progreso</Link>
            </div>
                </>
              );
            })()}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function PhotoCard({
  title,
  body,
  previewUrl,
  buttonLabel,
  onChange,
}: {
  title: string;
  body: string;
  previewUrl: string | null;
  buttonLabel: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <article className={styles.photoCard}>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {previewUrl ? <img src={previewUrl} alt={`Preview ${title.toLowerCase()}`} /> : <div className={styles.photoPlaceholder}>Sin foto</div>}
      <label className={styles.uploadButton}>
        {buttonLabel}
        <input type="file" accept="image/*" capture="environment" onChange={onChange} />
      </label>
    </article>
  );
}
