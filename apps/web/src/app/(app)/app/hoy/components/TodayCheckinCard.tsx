"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/design-system/components/Button";

const weeklyCoachHref = "/app/hoy/weekly-review#weekly-coach-checkin";

type CheckinTrendItem = {
  label: string;
  weightKg: number;
};

type TodayCheckinCardProps = {
  currentWeightKg?: number | null;
  previousWeightKg?: number | null;
  goalWeightKg?: number | null;
  checkinDoneThisWeek?: boolean;
  weeklyCoachCheckInDue?: boolean;
  checkinTrend?: CheckinTrendItem[];
  className?: string;
};

/**
 * TodayCheckinCard - Weight check-in card (980x250)
 * 
 * Features:
 * - Current weight display
 * - Previous weight comparison
 * - Goal weight indicator
 * - Mini trend chart (dots)
 * - Update/Register button
 */
export function TodayCheckinCard({
  currentWeightKg = null,
  previousWeightKg = null,
  goalWeightKg = null,
  checkinDoneThisWeek = false,
  weeklyCoachCheckInDue = false,
  checkinTrend = [],
  className,
}: TodayCheckinCardProps) {
  const router = useRouter();

  const handleRegister = () => {
    // Navigate to check-in flow
    router.push("/app/seguimiento/check-in");
  };

  // Calculate weight change from previous
  const weightChange = currentWeightKg && previousWeightKg 
    ? currentWeightKg - previousWeightKg 
    : null;
  
  // Calculate progress toward goal
  const goalProgress = currentWeightKg && goalWeightKg && previousWeightKg
    ? ((previousWeightKg - currentWeightKg) / (previousWeightKg - goalWeightKg)) * 100
    : null;

  return (
    <article
      className={`today-premium-card today-dashboard-card ${className ?? ""}`}
        style={{
        width: "100%",
        padding: "clamp(16px, 3vw, 32px)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "clamp(16px, 4vw, 48px)",
      }}
    >
      {/* Left side - Weight info */}
      <div style={{ 
        display: "flex", 
        gap: "clamp(24px, 5vw, 60px)", 
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        {/* Current weight */}
        <div>
          <p
            className="today-label"
            style={{
              letterSpacing: "0.15em",
              color: "rgba(234, 179, 8, 0.9)", // Yellow accent
              marginBottom: "clamp(4px, 1vw, 8px)",
            }}
          >
            PESO ACTUAL
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              className="today-headline-large"
              style={{ fontSize: "48px", lineHeight: 1 }}
            >
              {currentWeightKg !== null ? currentWeightKg : "--"}
            </span>
            <span style={{ fontSize: "20px", opacity: 0.7 }}>kg</span>
          </div>
          
          {/* Weight change indicator */}
          {weightChange !== null && (
            <p
              style={{
                fontSize: "14px",
                marginTop: "8px",
                color: weightChange <= 0 ? "#22c55e" : "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {weightChange <= 0 ? "↓" : "↑"} {Math.abs(weightChange).toFixed(1)} kg
              <span style={{ opacity: 0.6, color: "inherit" }}>
                vs semana pasada
              </span>
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "100px",
            background: "rgba(255,255,255,0.1)",
          }}
        />

        {/* Goal weight */}
        <div>
          <p
            style={{
              fontSize: "12px",
              opacity: 0.6,
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Meta
          </p>
          <p style={{ fontSize: "28px", fontWeight: 700 }}>
            {goalWeightKg !== null ? `${goalWeightKg} kg` : "--"}
          </p>
        </div>

        {/* Mini trend dots */}
        <div>
          <p
            style={{
              fontSize: "12px",
              opacity: 0.6,
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Tendencia
          </p>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "40px" }}>
            {checkinTrend.length > 0 ? (
              checkinTrend.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    width: "24px",
                    height: `${Math.min(Math.max((item.weightKg / (goalWeightKg || 100)) * 40, 8), 40)}px`,
                    borderRadius: "4px",
                    background: "rgba(234, 179, 8, 0.6)",
                  }}
                  title={`${item.label}: ${item.weightKg}kg`}
                />
              ))
            ) : (
              <p style={{ fontSize: "14px", opacity: 0.5 }}>Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Action */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "12px" }}>
        {checkinDoneThisWeek ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px 24px",
              background: "rgba(34, 197, 94, 0.15)",
              borderRadius: "16px",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <span style={{ fontSize: "24px" }}>✓</span>
            <span style={{ fontSize: "18px", fontWeight: 600, color: "#22c55e" }}>
              Pesado esta semana
            </span>
          </div>
        ) : (
          <Button
            onClick={handleRegister}
            style={{
              width: "200px",
              height: "56px",
              fontSize: "18px",
              fontWeight: 600,
              background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
              border: "none",
              borderRadius: "28px",
              cursor: "pointer",
              color: "#000",
              boxShadow: "0 4px 16px rgba(234, 179, 8, 0.3)",
            }}
          >
            Registrar peso
          </Button>
        )}

        {weeklyCoachCheckInDue ? (
          <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(234, 179, 8, 0.95)", margin: 0 }}>
            Check-in semanal pendiente
          </p>
        ) : null}

        <ButtonLink href={weeklyCoachHref} variant={weeklyCoachCheckInDue ? "primaryGlow" : "secondary"}>
          {weeklyCoachCheckInDue ? "Completar check-in semanal" : "Ver check-in semanal"}
        </ButtonLink>
      </div>
    </article>
  );
}
