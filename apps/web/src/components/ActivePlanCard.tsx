"use client";

import Link from "next/link";

type PlanSource = "assigned" | "ai" | "manual" | "own" | "selected";

type ActivePlanCardProps = {
  /** Type of plan: "training" or "nutrition" */
  type: "training" | "nutrition";
  /** Plan title if one is active, null if no plan */
  planTitle: string | null;
  /** Where the plan came from */
  source?: PlanSource | null;
  /** Optional: link to manage/select plans */
  manageHref?: string;
};

const SOURCE_CONFIG: Record<PlanSource, { label: string; badge: string; color: string }> = {
  assigned: {
    label: "Asignado por tu entrenador",
    badge: "Entrenador",
    color: "#8b5cf6", // purple
  },
  ai: {
    label: "Generado con IA",
    badge: "IA",
    color: "#06b6d4", // cyan
  },
  manual: {
    label: "Creado por ti",
    badge: "Manual",
    color: "#f59e0b", // amber
  },
  own: {
    label: "Tu plan activo",
    badge: "Propio",
    color: "#10b981", // green
  },
  selected: {
    label: "Seleccionado de la biblioteca",
    badge: "Biblioteca",
    color: "#3b82f6", // blue
  },
};

export function ActivePlanCard({
  type,
  planTitle,
  source,
  manageHref,
}: ActivePlanCardProps) {
  const hasPlan = Boolean(planTitle);
  const sourceInfo = source ? SOURCE_CONFIG[source] : null;

  const config = {
    training: {
      icon: "🏋️",
      activeLabel: "Plan de entrenamiento activo",
      emptyTitle: "Sin plan de entrenamiento",
      emptyDesc: "Activa un plan para empezar a entrenar",
      emptyCta: "Ver planes",
      fallbackHref: "/app/biblioteca/entrenamientos",
    },
    nutrition: {
      icon: "🥗",
      activeLabel: "Plan nutricional activo",
      emptyTitle: "Sin plan nutricional",
      emptyDesc: "Activa un plan para ver tu dieta",
      emptyCta: "Ver planes",
      fallbackHref: "/app/dietas",
    },
  }[type];

  const href = manageHref ?? config.fallbackHref;
  const accentColor = sourceInfo?.color ?? "var(--color-primary, #3b82f6)";

  return (
    <Link
      href={href}
      className="active-plan-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "16px",
        background: hasPlan
          ? `linear-gradient(135deg, ${accentColor}11, var(--color-surface))`
          : "var(--color-surface)",
        border: hasPlan
          ? `1.5px solid ${accentColor}`
          : "1.5px dashed var(--color-border, #e2e8f0)",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontSize: "28px",
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {hasPlan ? (
          <>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: accentColor,
              }}
            >
              {config.activeLabel}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--color-text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {planTitle}
            </p>
            {sourceInfo ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "4px",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: `${accentColor}18`,
                  color: accentColor,
                }}
              >
                {source === "assigned" ? "👨‍🏫" : source === "ai" ? "🤖" : "✏️"}{" "}
                {sourceInfo.label}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              {config.emptyTitle}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "12px",
                color: "var(--color-text-muted)",
              }}
            >
              {config.emptyDesc}
            </p>
          </>
        )}
      </div>

      <span
        style={{
          flexShrink: 0,
          fontSize: "12px",
          fontWeight: 600,
          padding: "6px 12px",
          borderRadius: "10px",
          background: hasPlan ? accentColor : "var(--color-surface-alt)",
          color: hasPlan ? "#fff" : "var(--color-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {hasPlan ? "Ver →" : config.emptyCta}
      </span>
    </Link>
  );
}
