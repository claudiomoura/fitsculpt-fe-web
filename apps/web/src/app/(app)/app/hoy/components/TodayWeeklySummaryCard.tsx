"use client";

type WeekDayData = {
  day: string;       // e.g., "Lun", "Mar", "Mié"
  completed: boolean;
  type: "training" | "nutrition" | "checkin" | null;
};

type TodayWeeklySummaryCardProps = {
  weekData?: WeekDayData[];
  className?: string;
};

/**
 * TodayWeeklySummaryCard - Week-at-a-glance card (980x290)
 * 
 * Features:
 * - 7-day completion visualization
 * - Mini chart area showing daily completion status
 * - Training/Nutrition/Check-in indicators
 */
export function TodayWeeklySummaryCard({
  weekData = [],
  className,
}: TodayWeeklySummaryCardProps) {
  // Default week data if none provided
  const days = weekData.length > 0 
    ? weekData 
    : [
        { day: "Lun", completed: true, type: "training" },
        { day: "Mar", completed: true, type: "nutrition" },
        { day: "Mié", completed: true, type: "checkin" },
        { day: "Jue", completed: false, type: null },
        { day: "Vie", completed: false, type: null },
        { day: "Sáb", completed: false, type: null },
        { day: "Dom", completed: false, type: null },
      ];

  const completedCount = days.filter(d => d.completed).length;
  const totalCount = days.length;

  // Get color for type
  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "training": return "#22c55e"; // Green
      case "nutrition": return "#8b5cf6"; // Violet
      case "checkin": return "#eab308"; // Yellow
      default: return "rgba(255,255,255,0.2)";
    }
  };

  return (
    <article
      className={`today-premium-card today-dashboard-card ${className ?? ""}`}
      style={{
        width: "100%",
        padding: "clamp(16px, 2.4vw, 24px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <div>
          <p
            className="today-label"
            style={{
              fontSize: "14px",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginBottom: "6px",
            }}
          >
            RESUMEN SEMANAL
          </p>
          <h3 className="today-headline-medium" style={{ fontSize: "clamp(22px, 4vw, 28px)", margin: 0 }}>
            Tu semana en perspectiva
          </h3>
        </div>
        
        {/* Completion count */}
        <div
          style={{
            textAlign: "right",
          }}
        >
          <p style={{ fontSize: "36px", fontWeight: 800 }}>
            {completedCount}/{totalCount}
          </p>
          <p style={{ fontSize: "14px", opacity: 0.6 }}>días completos</p>
        </div>
      </div>

      {/* Mini chart area - 7 days */}
      <div style={{ flex: 1, display: "flex", gap: "10px", alignItems: "flex-end" }}>
        {days.map((day, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* Day indicator */}
            <div
              style={{
                width: "100%",
                height: "80px",
                borderRadius: "12px",
                background: day.completed
                  ? getTypeColor(day.type)
                  : "rgba(255,255,255,0.05)",
                border: day.completed
                  ? "none"
                  : "1px dashed rgba(255,255,255,0.2)",
                boxShadow: day.completed
                  ? `0 4px 20px ${getTypeColor(day.type)}40`
                  : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
              }}
            >
              {day.completed && (
                <span style={{ fontSize: "24px" }}>✓</span>
              )}
            </div>
            
            {/* Day label */}
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                opacity: day.completed ? 1 : 0.5,
              }}
            >
              {day.day}
            </span>

            {/* Type indicator */}
            {day.type && (
              <span
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: `${getTypeColor(day.type)}30`,
                  color: getTypeColor(day.type),
                }}
              >
                {day.type === "training" ? "Entreno" :
                 day.type === "nutrition" ? "Nutri" :
                 day.type === "checkin" ? "Check" : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
