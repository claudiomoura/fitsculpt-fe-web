"use client";

type TodaySummaryCardProps = {
  dailyProgressPercent: number;
  completedGoals: number;
  totalGoals: number;
  // Mini metrics - training, nutrition, checkin
  trainingCompleted?: number;
  trainingTotal?: number;
  nutritionCompleted?: number;
  nutritionTotal?: number;
  checkinCompleted?: number;
  checkinTotal?: number;
  className?: string;
};

/**
 * TodaySummaryCard - Summary card with donut chart and mini metrics
 * 
 * 220px donut ring showing daily progress percentage
 * Below: 3 mini dots showing Entreno, Nutricion, Check-in status
 * Dimensions: 980x350 (flexible height)
 */
export function TodaySummaryCard({
  dailyProgressPercent,
  completedGoals,
  totalGoals,
  trainingCompleted = 1,
  trainingTotal = 1,
  nutritionCompleted = 2,
  nutritionTotal = 3,
  checkinCompleted = 0,
  checkinTotal = 1,
  className,
}: TodaySummaryCardProps) {
  // Calculate stroke dash for donut chart
  const radius = 90; // (220 - 20 padding - 20 border) / 2
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (dailyProgressPercent / 100) * circumference;

  return (
    <article
      className={`today-premium-card today-dashboard-card ${className ?? ""}`}
      style={{
        width: "100%",
        padding: "clamp(20px, 4vw, 40px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(16px, 3vw, 32px)",
      }}
    >
      {/* Donut Chart */}
      <div
        className="today-ring-premium"
        style={{
          position: "relative",
        }}
      >
        {/* SVG scales with CSS variables */}
        <svg
          viewBox="0 0 220 220"
          style={{ 
            transform: "rotate(-90deg)",
            width: "var(--today-donut-main)",
            height: "var(--today-donut-main)",
          }}
        >
          {/* Background circle */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="12"
          />
          {/* Progress circle - gradient */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="url(#donutGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
          <defs>
            <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-secondary)" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center text */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <span
            className="today-ring-premium-value"
          >
            {dailyProgressPercent}%
          </span>
          <p style={{ fontSize: "clamp(10px, 2vw, 14px)", opacity: 0.7, margin: 0 }}>
            Completado
          </p>
        </div>
      </div>

      {/* Goals summary */}
      <div style={{ textAlign: "center" }}>
        <p className="today-body-text">
          {completedGoals} de {totalGoals} metas diarias
        </p>
      </div>

      {/* Mini metrics - 3 dots */}
      <div
        style={{
          display: "flex",
          gap: "clamp(16px, 4vw, 40px)",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Entreno - Green */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 12px)" }}>
          <div
            style={{
              width: "clamp(8px, 1.5vw, 12px)",
              height: "clamp(8px, 1.5vw, 12px)",
              borderRadius: "50%",
               background: trainingCompleted >= trainingTotal ? "var(--status-success)" : "color-mix(in srgb, var(--status-success) 30%, transparent)",
               boxShadow: trainingCompleted >= trainingTotal ? "0 0 8px color-mix(in srgb, var(--status-success) 45%, transparent)" : "none",
            }}
          />
          <span className="today-label">
            Entreno {trainingCompleted}/{trainingTotal}
          </span>
        </div>

        {/* Nutricion */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 12px)" }}>
          <div
            style={{
              width: "clamp(8px, 1.5vw, 12px)",
              height: "clamp(8px, 1.5vw, 12px)",
              borderRadius: "50%",
               background: nutritionCompleted >= nutritionTotal ? "var(--color-secondary)" : "color-mix(in srgb, var(--color-secondary) 30%, transparent)",
               boxShadow: nutritionCompleted >= nutritionTotal ? "0 0 8px color-mix(in srgb, var(--color-secondary) 45%, transparent)" : "none",
            }}
          />
          <span className="today-label">
            Nutrición {nutritionCompleted}/{nutritionTotal}
          </span>
        </div>

        {/* Check-in - Yellow */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 12px)" }}>
          <div
            style={{
              width: "clamp(8px, 1.5vw, 12px)",
              height: "clamp(8px, 1.5vw, 12px)",
              borderRadius: "50%",
               background: checkinCompleted >= checkinTotal ? "var(--status-warning)" : "color-mix(in srgb, var(--status-warning) 30%, transparent)",
               boxShadow: checkinCompleted >= checkinTotal ? "0 0 8px color-mix(in srgb, var(--status-warning) 45%, transparent)" : "none",
            }}
          />
          <span className="today-label">
            Check-in {checkinCompleted >= checkinTotal ? "Hecho" : "pend."}
          </span>
        </div>
      </div>
    </article>
  );
}
