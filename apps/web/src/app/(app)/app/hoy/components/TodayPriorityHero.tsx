"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/design-system/components/Button";

type TodayPriorityHeroProps = {
  trainingState: "workout" | "rest" | "no-plan";
  trainingName?: string;
  trainingDuration?: number | null;
  trainingExerciseCount?: number;
  todayWorkoutId?: string | null;
  hasTrainingAccess?: boolean;
  className?: string;
};

/**
 * TodayPriorityHero - Large workout card (980x420)
 * 
 * Displays workout/activity with:
 * - eyebrow (e.g., "ENTRENO PROGRAMADO")
 * - title (workout name)
 * - meta (duration, exercises)
 * - body (description)
 * - dismiss button
 * - 3 buttons: Empezar (360px), Detalles (270px), Hecho (170px)
 * - progress bar
 */
export function TodayPriorityHero({
  trainingState,
  trainingName = "Entrenamiento",
  trainingDuration = 45,
  trainingExerciseCount = 8,
  todayWorkoutId,
  hasTrainingAccess = true,
  className,
}: TodayPriorityHeroProps) {
  const router = useRouter();

  const handleStart = () => {
    if (todayWorkoutId) {
      router.push(`/app/entreno/${todayWorkoutId}`);
    }
  };

  const handleDetails = () => {
    router.push("/app/entreno");
  };

  const handleDone = () => {
    // Mark as complete - would call API
    console.log("Mark workout as done");
  };

  // Determine display based on training state
  const getStateDisplay = () => {
    switch (trainingState) {
      case "rest":
        return {
          eyebrow: "DÍA DE DESCANSO",
          title: "Hoy es día de descanso",
          body: "Tu cuerpo se recupera para el próximo entrenamiento",
          showProgress: false,
        };
      case "no-plan":
        return {
          eyebrow: "SIN PLAN",
          title: "Sin entrenamiento programado",
          body: "Configura un plan de entrenamiento para comenzar",
          showProgress: false,
        };
      case "workout":
      default:
        return {
          eyebrow: "ENTRENO PROGRAMADO",
          title: trainingName,
          body: `${trainingDuration || 45} min • ${trainingExerciseCount || 8} ejercicios`,
          showProgress: true,
        };
    }
  };

  const display = getStateDisplay();
  const canStart = trainingState === "workout" && hasTrainingAccess;

  return (
    <article
      className={`today-premium-card today-dashboard-card ${className ?? ""}`}
      style={{
        width: "100%",
        padding: "clamp(16px, 3vw, 32px)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        minHeight: "clamp(280px, 50vw, 360px)",
      }}
    >
      {/* Dismiss button - top right */}
      <button
        aria-label="Cerrar"
        style={{
          position: "absolute",
          top: "clamp(12px, 2vw, 20px)",
          right: "clamp(12px, 2vw, 20px)",
          width: "clamp(32px, 5vw, 40px)",
          height: "clamp(32px, 5vw, 40px)",
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(16px, 2.5vw, 20px)",
        }}
      >
        ×
      </button>

      {/* Eyebrow */}
      <p
        className="today-label"
        style={{
          letterSpacing: "0.15em",
          color: "rgba(0, 180, 160, 0.9)",
          marginBottom: "clamp(8px, 1.5vw, 12px)",
        }}
      >
        {display.eyebrow}
      </p>

      {/* Title */}
      <h2
        className="today-headline-large"
        style={{
          marginBottom: "clamp(4px, 1vw, 8px)",
          lineHeight: 1.1,
        }}
      >
        {display.title}
      </h2>

      {/* Meta */}
      <p
        className="today-body-text"
        style={{
          opacity: 0.7,
          marginBottom: "clamp(12px, 2vw, 16px)",
        }}
      >
        {display.body}
      </p>

      {/* Spacer to push buttons to bottom */}
      <div style={{ flex: 1 }} />

      {/* Progress bar (if applicable) */}
      {display.showProgress && (
        <div
          style={{
            marginBottom: "clamp(16px, 3vw, 24px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "clamp(6px, 1vw, 8px)",
            }}
          >
            <span style={{ fontSize: "clamp(12px, 1.5vw, 14px)", opacity: 0.7 }}>Progreso</span>
            <span style={{ fontSize: "clamp(12px, 1.5vw, 14px)", fontWeight: 600 }}>0%</span>
          </div>
          <div
            style={{
              height: "clamp(6px, 1.2vw, 10px)",
              borderRadius: "5px",
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "0%",
                height: "100%",
                background: "linear-gradient(90deg, #00B4A0 0%, #2378FF 100%)",
                borderRadius: "5px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Action buttons - responsive layout */}
      <div
        style={{
          display: "flex",
          gap: "clamp(8px, 2vw, 16px)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Empezar button - primary gradient */}
        <Button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            flex: "clamp(120px, 30vw, 360px)",
            minWidth: "120px",
            height: "clamp(44px, 8vw, 56px)",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 600,
            background: canStart
              ? "linear-gradient(135deg, #00B4A0 0%, #2378FF 100%)"
              : "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "28px",
            cursor: canStart ? "pointer" : "not-allowed",
            color: "#fff",
            boxShadow: canStart
              ? "0 4px 20px rgba(0, 180, 160, 0.3)"
              : "none",
          }}
        >
          Empezar
        </Button>

        {/* Detalles button - secondary outline */}
        <Button
          onClick={handleDetails}
          style={{
            flex: "clamp(80px, 20vw, 270px)",
            minWidth: "80px",
            height: "clamp(44px, 8vw, 56px)",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 500,
            background: "transparent",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "28px",
            cursor: "pointer",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          Detalles
        </Button>

        {/* Hecho button - secondary */}
        <Button
          onClick={handleDone}
          disabled={!canStart}
          style={{
            flex: "clamp(60px, 15vw, 170px)",
            minWidth: "60px",
            height: "clamp(44px, 8vw, 56px)",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 500,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "28px",
            cursor: canStart ? "pointer" : "not-allowed",
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          Hecho
        </Button>
      </div>
    </article>
  );
}
