"use client";

import Link from "next/link";
import { ButtonLink } from "@/design-system/components/Button";
import { useLanguage } from "@/context/LanguageProvider";

type TodayNutritionCardProps = {
  consumedCalories: number;
  targetCalories?: number | null;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
  mealsLogged?: number;
  mealsTotal?: number;
  hasPlan?: boolean;
  hasAiEntitlement?: boolean;
  nutritionHref?: string;
  detailsHref?: string;
  editHref?: string;
  aiCreateHref?: string;
  className?: string;
};

/**
 * TodayNutritionCard - Nutrition tracking card (980x320)
 * 
 * Features:
 * - 160px mini ring showing calorie percentage
 * - Macros display (protein, carbs, fats)
 * - Meals logged count
 */
export function TodayNutritionCard({
  consumedCalories = 0,
  targetCalories = 2000,
  proteinG = 0,
  carbsG = 0,
  fatsG = 0,
  mealsLogged = 0,
  mealsTotal = 3,
  hasPlan = true,
  hasAiEntitlement = false,
  nutritionHref = "/app/nutricion",
  detailsHref = "/app/nutricion",
  editHref = "/app/nutricion/editar",
  aiCreateHref = "/app/nutricion?ai=1",
  className,
}: TodayNutritionCardProps) {
  const { t } = useLanguage();
  
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/app/hoy";
  const billingHref = `/app/settings/billing?returnTo=${encodeURIComponent(currentPath)}`;
  // Calculate percentage
  const percent = targetCalories ? Math.min(Math.round((consumedCalories / targetCalories) * 100), 100) : 0;
  const remainingCalories = typeof targetCalories === "number" && Number.isFinite(targetCalories)
    ? Math.max(0, Math.round(targetCalories - consumedCalories))
    : null;
  
  // Ring calculations (160px diameter)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <article
      className={`today-premium-card today-dashboard-card ${className ?? ""}`}
      style={{
        width: "100%",
        padding: "clamp(16px, 3vw, 32px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 3vw, 32px)",
      }}
    >
      {/* Left side - Calories - stack on mobile, row on desktop */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "clamp(16px, 4vw, 32px)",
        width: "100%",
      }}>
        <div style={{ flex: 1 }}>
          <p
            className="today-label"
            style={{
              letterSpacing: "0.15em",
              color: "rgba(139, 92, 246, 0.9)", // Violet accent
              marginBottom: "clamp(8px, 2vw, 16px)",
            }}
          >
            NUTRICIÓN
          </p>
          
          {/* Calories display */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "clamp(6px, 1.5vw, 12px)" }}>
            <span
              className="today-headline-large"
              style={{ lineHeight: 1 }}
            >
              {consumedCalories}
            </span>
            <span style={{ fontSize: "clamp(14px, 2vw, 20px)", opacity: 0.7 }}>
              / {targetCalories} kcal
            </span>
          </div>

          {/* Meals logged */}
          <p style={{ fontSize: "clamp(13px, 2vw, 16px)", opacity: 0.7, marginTop: "clamp(8px, 1.5vw, 12px)" }}>
            {mealsLogged} de {mealsTotal} comidas registradas
          </p>

          {remainingCalories !== null ? (
            <p style={{ fontSize: "clamp(12px, 1.7vw, 14px)", opacity: 0.65, marginTop: 6 }}>
              {remainingCalories} kcal restantes para hoy
            </p>
          ) : null}

          {/* Macros - hide on very small screens */}
          <div style={{ display: "flex", gap: "clamp(16px, 3vw, 32px)", marginTop: "clamp(12px, 2vw, 24px)" }}>
            <div>
              <p style={{ fontSize: "clamp(10px, 1.5vw, 12px)", opacity: 0.6, marginBottom: "2px" }}>Proteína</p>
              <p style={{ fontSize: "clamp(16px, 3vw, 24px)", fontWeight: 700, color: "#22c55e" }}>{proteinG}g</p>
            </div>
            <div>
              <p style={{ fontSize: "clamp(10px, 1.5vw, 12px)", opacity: 0.6, marginBottom: "2px" }}>Carbs</p>
              <p style={{ fontSize: "clamp(16px, 3vw, 24px)", fontWeight: 700, color: "#eab308" }}>{carbsG}g</p>
            </div>
            <div>
              <p style={{ fontSize: "clamp(10px, 1.5vw, 12px)", opacity: 0.6, marginBottom: "2px" }}>Grasas</p>
              <p style={{ fontSize: "clamp(16px, 3vw, 24px)", fontWeight: 700, color: "#f97316" }}>{fatsG}g</p>
            </div>
          </div>
        </div>

        {/* Right side - Mini ring */}
        <div
          className="today-nutrition-ring-premium"
          style={{
            position: "relative",
            width: "var(--today-donut-mini)",
            height: "var(--today-donut-mini)",
            flexShrink: 0,
          }}
        >
        <svg
          viewBox="0 0 160 160"
          style={{ 
            transform: "rotate(-90deg)",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="10"
          />
          {/* Progress circle - violet gradient */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#nutritionRingGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
          <defs>
            <linearGradient id="nutritionRingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#a855f7" />
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
          <span style={{ fontSize: "32px", fontWeight: 800 }}>
            {percent}%
          </span>
        </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(8px, 2vw, 16px)", alignItems: "center" }}>
        {/* Primary (AZUL): Crear con IA - goes to billing if FREE */}
        {hasPlan ? (
          <ButtonLink
            as={Link}
            href={nutritionHref}
            variant="primary"
            className="fit-content"
            style={{
              flex: "clamp(120px, 30vw, 360px)",
              minWidth: "120px",
              height: "clamp(44px, 8vw, 56px)",
              fontSize: "clamp(14px, 2vw, 18px)",
              fontWeight: 600,
              background: "linear-gradient(135deg, #00B4A0 0%, #2378FF 100%)",
              border: "none",
              borderRadius: "28px",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(0, 180, 160, 0.3)",
            }}
          >
            {t("today.nutritionPrimaryCta")}
          </ButtonLink>
        ) : hasAiEntitlement ? (
          <ButtonLink
            as={Link}
            href={aiCreateHref}
            variant="primary"
            className="fit-content"
            style={{
              flex: "clamp(120px, 30vw, 360px)",
              minWidth: "120px",
              height: "clamp(44px, 8vw, 56px)",
              fontSize: "clamp(14px, 2vw, 18px)",
              fontWeight: 600,
              background: "linear-gradient(135deg, #00B4A0 0%, #2378FF 100%)",
              border: "none",
              borderRadius: "28px",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(0, 180, 160, 0.3)",
            }}
          >
            {t("today.nutritionCreateAiCta")}
          </ButtonLink>
        ) : (
          <ButtonLink
            as={Link}
            href={billingHref}
            variant="primary"
            className="fit-content"
            style={{
              flex: "clamp(120px, 30vw, 360px)",
              minWidth: "120px",
              height: "clamp(44px, 8vw, 56px)",
              fontSize: "clamp(14px, 2vw, 18px)",
              fontWeight: 600,
              background: "linear-gradient(135deg, #00B4A0 0%, #2378FF 100%)",
              border: "none",
              borderRadius: "28px",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(0, 180, 160, 0.3)",
            }}
          >
            {t("today.nutritionCreateAiCta")}
          </ButtonLink>
        )}

        {/* Secondary: Unirse a un gimnasio */}
        <ButtonLink
          as={Link}
          href="/app/gym"
          variant="secondary"
          className="fit-content"
          style={{
            flex: "clamp(80px, 20vw, 270px)",
            minWidth: "80px",
            height: "clamp(44px, 8vw, 56px)",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 500,
            background: "transparent",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "28px",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          {t("gym.join.consumerCta")}
        </ButtonLink>

        {/* Tertiary: Crear manual */}
        <ButtonLink
          as={Link}
          href={editHref}
          variant="ghost"
          className="fit-content"
          style={{
            flex: "clamp(60px, 15vw, 170px)",
            minWidth: "60px",
            height: "clamp(44px, 8vw, 56px)",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 500,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "28px",
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          {hasPlan ? t("today.nutritionEditCta") : t("today.nutritionCreateManualCta")}
        </ButtonLink>
      </div>
    </article>
  );
}
