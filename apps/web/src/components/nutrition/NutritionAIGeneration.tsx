"use client";

import Link from "next/link";
import { Button } from "@/design-system/components/Button";
import { Icon } from "@/design-system/components/Icon";
import { Modal } from "@/design-system/components/Modal";
import { AiModuleUpgradeCTA } from "@/components/UpgradeCTA/AiModuleUpgradeCTA";
import { AiTokensExhaustedModal } from "@/components/ai/AiTokensExhaustedModal";
import type { NutritionPlanData } from "@/lib/profile";

type NutritionAiErrorState = {
  title: string;
  description: string;
  actionableHint: string | null;
  details: string | null;
  canRetry: boolean;
  ctaHref: string | null;
  ctaLabel: string | null;
};

type AiUsageSummary = {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  balanceAfter?: number;
};

type NutritionAIGenerationProps = {
  aiLoading: boolean;
  aiError: NutritionAiErrorState | null;
  aiQuotaExceededError: boolean;
  aiSuccessModalOpen: boolean;
  tokensExhaustedModalOpen: boolean;
  startDatePickerOpen: boolean;
  aiStartDate: Date;
  lastGeneratedAiPlan: NutritionPlanData | null;
  lastGeneratedUsage: AiUsageSummary | null;
  lastGeneratedMode: string | null;
  lastGeneratedAiRequestId: string | null;
  lastGeneratedPlanId: string | null;
  lastGeneratedTokensBalance: number | null;
  aiTokenBalance: number | null;
  isAiLocked: boolean;
  isOutOfTokens: boolean;
  isAiDisabled: boolean;
  aiLockDescription: string;
  locale: string;
  selectedDate: Date;
  safeT: (key: string, fallback?: string) => string;
  t: (key: string) => string;
  onGenerateClick: () => void;
  onRetry: () => void;
  onAiPlan: (mode: "default" | "simple") => void;
  onCloseAiSuccessModal: () => void;
  onViewGeneratedPlan: () => void;
  onCloseTokensExhausted: () => void;
  onConfirmStartDate: () => void;
  onCancelStartDate: () => void;
  onStartDateChange: (date: Date) => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

export function NutritionAIGeneration({
  aiLoading,
  aiError,
  aiQuotaExceededError,
  aiSuccessModalOpen,
  tokensExhaustedModalOpen,
  startDatePickerOpen,
  aiStartDate,
  lastGeneratedAiPlan,
  lastGeneratedUsage,
  lastGeneratedMode,
  lastGeneratedAiRequestId,
  lastGeneratedPlanId,
  lastGeneratedTokensBalance,
  aiTokenBalance,
  isAiLocked,
  isOutOfTokens,
  isAiDisabled,
  aiLockDescription,
  locale,
  selectedDate,
  safeT,
  t,
  onGenerateClick,
  onRetry,
  onAiPlan,
  onCloseAiSuccessModal,
  onViewGeneratedPlan,
  onCloseTokensExhausted,
  onConfirmStartDate,
  onCancelStartDate,
  onStartDateChange,
}: NutritionAIGenerationProps) {
  const getMealTitle = (meal: { title?: string }, fallback: string) => {
    const title = meal.title?.trim();
    return title && title.length > 0 ? title : fallback;
  };

  const generatedPlanPreviewDay = (() => {
    if (!lastGeneratedAiPlan?.days?.length) return null;
    const today = new Date();
    const dayOfWeek = selectedDate.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayDate = new Date(selectedDate);
    mondayDate.setDate(selectedDate.getDate() - daysSinceMonday);
    const currentDayKey = mondayDate.toISOString().split("T")[0];
    const indexedDays = lastGeneratedAiPlan.days.map((day, index) => {
      const fallbackDate = lastGeneratedAiPlan.startDate
        ? new Date(new Date(lastGeneratedAiPlan.startDate).getTime() + index * 86400000).toISOString().split("T")[0]
        : null;
      return { day, date: day.date ?? fallbackDate };
    });
    return (
      indexedDays.find((entry) => entry.date === currentDayKey) ??
      indexedDays[0] ??
      null
    );
  })();

  return (
    <>
      {/* AI Generating Modal */}
      <Modal
        open={aiLoading}
        onClose={() => undefined}
        title={safeT(
          "nutrition.aiGeneratingTitle",
          "Estamos generando tu plan nutricional",
        )}
        description={safeT(
          "nutrition.aiGeneratingDescription",
          "Analizamos tu perfil y objetivos para crear un plan de alta adherencia.",
        )}
      >
        <div className="stack-sm" aria-live="polite" aria-busy="true">
          <div className="inline-actions-sm">
            <span className="ui-spinner" aria-hidden="true" />
            <strong>
              {safeT(
                "nutrition.aiGeneratingStatus",
                "Generando menú semanal con IA...",
              )}
            </strong>
          </div>
          <p className="muted m-0">
            {safeT(
              "nutrition.aiGeneratingHint",
              "No cierres esta pantalla. Te mostraremos el resultado en cuanto esté listo.",
            )}
          </p>
        </div>
      </Modal>

      {/* AI Success Modal */}
      <Modal
        open={aiSuccessModalOpen}
        onClose={onCloseAiSuccessModal}
        title={t("nutrition.aiSuccessModal.title")}
        description={t("nutrition.aiSuccessModal.description")}
        footer={
          <div className="inline-actions-sm">
            <Button variant="secondary" onClick={onCloseAiSuccessModal}>
              {t("nutrition.aiSuccessModal.close")}
            </Button>
            <Button onClick={onViewGeneratedPlan}>
              {t("nutrition.aiSuccessModal.viewPlan")}
            </Button>
          </div>
        }
      >
        {lastGeneratedAiPlan ? (
          <div
            className="stack-md"
            style={{ maxHeight: "55vh", overflowY: "auto" }}
          >
            <div className="feature-card feature-card--compact">
              <p className="m-0">
                <strong>{t("nutrition.aiSuccessModal.summaryTitle")}</strong>
              </p>
              <ul className="list-muted-sm mt-8">
                <li>
                  {t("nutrition.aiSuccessModal.planTitle")}:{" "}
                  {lastGeneratedAiPlan.title?.trim() || "-"}
                </li>
                <li>
                  {t("nutrition.aiSuccessModal.startDate")}:{" "}
                  {formatDate(lastGeneratedAiPlan.startDate)}
                </li>
                <li>
                  {t("nutrition.aiSuccessModal.daysCount")}:{" "}
                  {lastGeneratedAiPlan.days.length}
                </li>
                <li>
                  {t("nutrition.aiSuccessModal.targetCalories")}:{" "}
                  {lastGeneratedAiPlan.dailyCalories} {t("units.kcal")}
                </li>
                <li>
                  {t("nutrition.aiSuccessModal.targetMacros")}:{" "}
                  {lastGeneratedAiPlan.proteinG}
                  {t("nutrition.grams")}/{lastGeneratedAiPlan.carbsG}
                  {t("nutrition.grams")}/{lastGeneratedAiPlan.fatG}
                  {t("nutrition.grams")}
                </li>
              </ul>
            </div>

            {generatedPlanPreviewDay ? (
              <div className="feature-card feature-card--compact">
                <p className="m-0">
                  <strong>
                    {t("nutrition.aiSuccessModal.dayPreviewTitle")}
                  </strong>
                </p>
                <p className="muted mt-4 mb-0">
                  {generatedPlanPreviewDay.day.dayLabel}
                </p>
                <ul className="list-muted-sm mt-8">
                  {generatedPlanPreviewDay.day.meals.map((meal, index) => (
                    <li key={`${meal.title}-${index}`}>
                      {getMealTitle(meal, t("nutrition.mealTitleFallback"))} · {meal.macros.calories}{" "}
                      {t("units.kcal")} · P {meal.macros.protein}
                      {t("nutrition.grams")} · C {meal.macros.carbs}
                      {t("nutrition.grams")} · G {meal.macros.fats}
                      {t("nutrition.grams")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lastGeneratedMode === "FALLBACK" ||
            typeof lastGeneratedUsage?.totalTokens === "number" ||
            typeof lastGeneratedUsage?.promptTokens === "number" ||
            typeof lastGeneratedUsage?.completionTokens === "number" ||
            typeof lastGeneratedUsage?.balanceAfter === "number" ? (
              <div className="feature-card feature-card--compact">
                <p className="m-0">
                  <strong>{t("nutrition.aiSuccessModal.aiBlockTitle")}</strong>
                </p>
                <ul className="list-muted-sm mt-8">
                  <li>
                    {t("nutrition.aiSuccessModal.tokensUsed")}:{" "}
                    {lastGeneratedMode === "FALLBACK"
                      ? t("nutrition.aiSuccessModal.fallbackTokens")
                      : (lastGeneratedUsage?.totalTokens ??
                        t("nutrition.aiSuccessModal.notAvailable"))}
                  </li>
                  {typeof lastGeneratedUsage?.promptTokens === "number" ? (
                    <li>
                      {t("nutrition.aiSuccessModal.promptTokens")}:{" "}
                      {lastGeneratedUsage.promptTokens}
                    </li>
                  ) : null}
                  {typeof lastGeneratedUsage?.completionTokens === "number" ? (
                    <li>
                      {t("nutrition.aiSuccessModal.completionTokens")}:{" "}
                      {lastGeneratedUsage.completionTokens}
                    </li>
                  ) : null}
                  {lastGeneratedAiRequestId ? (
                    <li>
                      {t("nutrition.aiSuccessModal.aiRequestId")}:{" "}
                      {lastGeneratedAiRequestId}
                    </li>
                  ) : null}
                  <li>
                    {t("nutrition.aiSuccessModal.currentBalance")}:{" "}
                    {lastGeneratedUsage?.balanceAfter ??
                      lastGeneratedTokensBalance ??
                      aiTokenBalance ??
                      "-"}
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* AI Tokens Exhausted Modal */}
      <AiTokensExhaustedModal
        open={tokensExhaustedModalOpen}
        onClose={onCloseTokensExhausted}
        title={t("ai.tokensExhaustedTitle")}
        description={t("ai.tokensExhaustedDescription")}
        body={t("ai.insufficientTokens")}
        closeLabel={t("ui.close")}
        ctaLabel={t("billing.manageBilling")}
      />

      {/* AI Start Date Picker Modal */}
      <Modal
        open={startDatePickerOpen}
        onClose={onCancelStartDate}
        title={safeT("nutrition.aiStartDateModal.title")}
        description={safeT("nutrition.aiStartDateModal.description")}
        footer={
          <div className="inline-actions-sm">
            <Button
              variant="secondary"
              onClick={onCancelStartDate}
            >
              {safeT("ui.cancel")}
            </Button>
            <Button onClick={onConfirmStartDate} disabled={aiLoading}>
              {aiLoading
                ? safeT("nutrition.aiGenerating")
                : safeT(
                    "nutrition.aiStartDateModal.confirm",
                    "Guardar y generar",
                  )}
            </Button>
          </div>
        }
      >
        <div className="ai-start-date-picker">
          <p className="ai-start-date-instruction">
            {safeT(
              "nutrition.aiStartDateModal.instruction",
              "Selecciona el día en que quieres comenzar tu plan de 4 semanas.",
            )}
          </p>

          <div className="ai-start-date-display">
            <Icon name="calendar" size={20} />
            <div className="ai-start-date-display__content">
              <span className="ai-start-date-display__label">
                {safeT("nutrition.aiStartDateModal.startsOn")}
              </span>
              <span className="ai-start-date-display__date">
                {aiStartDate.toLocaleDateString(locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
          </div>

          <div className="ai-start-date-calendar">
            {(() => {
              const weeks = [];
              const today = new Date();
              const startOfCurrentWeek = new Date(today);
              const dayOfWeek = today.getDay();
              const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
              startOfCurrentWeek.setDate(today.getDate() + (dayOfWeek === 0 ? 1 : 1 - dayOfWeek));
              
              for (let week = 0; week < 4; week++) {
                const weekStart = new Date(startOfCurrentWeek);
                weekStart.setDate(startOfCurrentWeek.getDate() + week * 7);
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(weekStart);
                  d.setDate(weekStart.getDate() + i);
                  return d;
                });
                weeks.push(weekDays);
              }

              const refDate = new Date(2025, 0, 1);
              const dayNames = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(refDate);
                d.setDate(d.getDate() + i);
                return d
                  .toLocaleDateString(locale, { weekday: "short" })
                  .charAt(0)
                  .toUpperCase();
              });

              return (
                <div className="ai-start-date-calendar__grid">
                  <div className="ai-start-date-calendar__headers">
                    {dayNames.map((day, i) => (
                      <span key={i} className="ai-start-date-calendar__header">
                        {day}
                      </span>
                    ))}
                  </div>
                  {weeks.map((week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className="ai-start-date-calendar__week"
                    >
                      {week.map((date) => {
                        const isPast =
                          date < today && date.toISOString().split("T")[0] !== today.toISOString().split("T")[0];
                        const isSelected =
                          date.toISOString().split("T")[0] === aiStartDate.toISOString().split("T")[0];
                        const isToday = date.toISOString().split("T")[0] === today.toISOString().split("T")[0];

                        return (
                          <button
                            key={date.toISOString().split("T")[0]}
                            type="button"
                            className={`ai-start-date-calendar__day ${isSelected ? "ai-start-date-calendar__day--selected" : ""} ${isToday ? "ai-start-date-calendar__day--today" : ""} ${isPast ? "ai-start-date-calendar__day--disabled" : ""}`}
                            onClick={() => !isPast && onStartDateChange(date)}
                            disabled={isPast}
                            aria-label={date.toLocaleDateString(locale, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="ai-start-date-info">
            <Icon name="info" size={14} />
            <span>{safeT("nutrition.aiStartDateModal.planDuration")}</span>
          </div>
        </div>
      </Modal>
    </>
  );
}
