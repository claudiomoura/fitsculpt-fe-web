import type { ChangeEvent } from "react";
import styles from "./GuidedBodyScanCapture.module.css";

type GuidedBodyScanCaptureProps = {
  frontPreviewUrl: string | null;
  sidePreviewUrl: string | null;
  isProcessing: boolean;
  errorMessage: string | null;
  onFrontUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onSideUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
};

type StepDefinition = {
  id: "preparacion" | "frontal" | "lateral" | "confirmacion";
  title: string;
};

const STEPS: StepDefinition[] = [
  { id: "preparacion", title: "Paso 1: Preparacion" },
  { id: "frontal", title: "Paso 2: Foto frontal" },
  { id: "lateral", title: "Paso 3: Foto lateral" },
  { id: "confirmacion", title: "Paso 4: Confirmacion" },
];

function getActiveStep(frontPreviewUrl: string | null, sidePreviewUrl: string | null) {
  if (!frontPreviewUrl && !sidePreviewUrl) return 0;
  if (!frontPreviewUrl) return 1;
  if (!sidePreviewUrl) return 2;
  return 3;
}

function getStepStatus(index: number, activeStep: number, allPhotosReady: boolean) {
  if (index === 3 && allPhotosReady) return "completado";
  if (index < activeStep) return "completado";
  if (index === activeStep) return "actual";
  return "pendiente";
}

function getNextStepCopy(frontPreviewUrl: string | null, sidePreviewUrl: string | null) {
  if (!frontPreviewUrl && !sidePreviewUrl) {
    return "Prepara el espacio: separa la camara a 1.5-2 m y mantenla a la altura del pecho.";
  }
  if (!frontPreviewUrl) {
    return "Haz la toma frontal con cuerpo completo, brazos relajados y pies al ancho de hombros.";
  }
  if (!sidePreviewUrl) {
    return "Ahora girate 90 grados para la toma lateral, sin inclinar la camara ni el torso.";
  }
  return "Listo para confirmar: revisa que ambas fotos se vean nitidas y sube tu check-in.";
}

function getStatusLabel(status: ReturnType<typeof getStepStatus>) {
  if (status === "completado") return "Completado";
  if (status === "actual") return "Actual";
  return "Pendiente";
}

export default function GuidedBodyScanCapture({
  frontPreviewUrl,
  sidePreviewUrl,
  isProcessing,
  errorMessage,
  onFrontUpload,
  onSideUpload,
}: GuidedBodyScanCaptureProps) {
  const activeStep = getActiveStep(frontPreviewUrl, sidePreviewUrl);
  const allPhotosReady = Boolean(frontPreviewUrl && sidePreviewUrl);

  return (
    <section className={styles.guidedCaptureSection} aria-label="Escaneo corporal guiado">
      <header className={styles.header}>
        <h3 className="section-title section-title-sm">Escaneo corporal guiado</h3>
        <p className="muted">
          Sigue estos pasos para capturar fotos consistentes y comparar tu progreso semana a semana.
        </p>
      </header>

      <ol className={styles.stepper}>
        {STEPS.map((step, index) => {
          const status = getStepStatus(index, activeStep, allPhotosReady);
          const isCurrent = status === "actual";
          const isComplete = status === "completado";

          return (
            <li
              key={step.id}
              data-testid={`guided-step-${step.id}`}
              data-status={status}
              className={`${styles.stepItem} ${isCurrent ? styles.stepItemCurrent : ""} ${isComplete ? styles.stepItemComplete : ""}`}
            >
              <span className={styles.stepBadge} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepStatus}>{getStatusLabel(status)}</span>
            </li>
          );
        })}
      </ol>

      <ul className={styles.qualityChecklist}>
        <li>Buena luz frontal, evita contraluz o sombras fuertes.</li>
        <li>Camara a la altura del pecho; acercate o alejate para ver el cuerpo completo.</li>
        <li>Fondo despejado y fijo para facilitar comparaciones reales.</li>
        <li>Postura neutral: abdomen relajado, hombros sueltos y mirada al frente.</li>
      </ul>

      <div className={styles.captureGrid}>
        <article className={styles.captureCard}>
          <strong>Frontal</strong>
          <span className="muted">Mirando al frente, brazos relajados y pies paralelos.</span>
          {frontPreviewUrl ? (
            <img
              src={frontPreviewUrl}
              alt="Preview foto frontal"
              className={styles.capturePreview}
            />
          ) : (
            <div className={styles.capturePlaceholder}>Aun no hay foto frontal</div>
          )}
          <label className={styles.uploadButton}>
            {frontPreviewUrl ? "Repetir foto frontal" : "Subir foto frontal"}
            <input
              type="file"
              className={styles.uploadInput}
              accept="image/*"
              capture="environment"
              onChange={onFrontUpload}
            />
          </label>
        </article>

        <article className={styles.captureCard}>
          <strong>Lateral</strong>
          <span className="muted">Girate 90 grados y manten la misma distancia de camara.</span>
          {sidePreviewUrl ? (
            <img
              src={sidePreviewUrl}
              alt="Preview foto lateral"
              className={styles.capturePreview}
            />
          ) : (
            <div className={styles.capturePlaceholder}>Aun no hay foto lateral</div>
          )}
          <label className={styles.uploadButton}>
            {sidePreviewUrl ? "Repetir foto lateral" : "Subir foto lateral"}
            <input
              type="file"
              className={styles.uploadInput}
              accept="image/*"
              capture="environment"
              onChange={onSideUpload}
            />
          </label>
        </article>
      </div>

      <div
        className={`${styles.statusCard} ${errorMessage ? styles.statusCardError : ""}`}
        role={errorMessage ? "alert" : "status"}
        aria-live="polite"
      >
        <span className={styles.statusLabel}>Siguiente paso</span>
        <span className={styles.statusText}>
          {errorMessage ? errorMessage : getNextStepCopy(frontPreviewUrl, sidePreviewUrl)}
        </span>
        {isProcessing ? (
          <span className="muted">Procesando imagen, espera un momento...</span>
        ) : null}
      </div>
    </section>
  );
}
