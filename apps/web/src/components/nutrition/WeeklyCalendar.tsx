"use client";

import { useMemo } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { WeekGridCompact } from "@/design-system/components";

type WeeklyCalendarDay = {
  id: string;
  label: string;
  date: string;
  selected: boolean;
  mealCount: number;
  dayCalories: number;
};

import type { ReactNode } from "react";

type WeeklyCalendarProps = {
  previousWeekLabel: string;
  nextWeekLabel: string;
  previousWeekAriaLabel: string;
  nextWeekAriaLabel: string;
  weekLabel: string;
  weekNumber: number;
  weekRangeLabel: string;
  nextWeekDisabled: boolean;
  hasWeeklyMeals: boolean;
  emptyTitle: string;
  emptySubtitle: string;
  emptyActions?: ReactNode;
  selectWeekDayAria: (day: WeeklyCalendarDay) => string;
  kcalLabel: string;
  days: WeeklyCalendarDay[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onSelectDay: (dayId: string) => void;
};

export function WeeklyCalendar({
  previousWeekLabel,
  nextWeekLabel,
  previousWeekAriaLabel,
  nextWeekAriaLabel,
  weekLabel,
  weekNumber,
  weekRangeLabel,
  nextWeekDisabled,
  hasWeeklyMeals,
  emptyTitle,
  emptySubtitle,
  emptyActions,
  selectWeekDayAria,
  kcalLabel,
  days,
  onPreviousWeek,
  onNextWeek,
  onSelectDay,
}: WeeklyCalendarProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const selectedIndex = Math.max(0, days.findIndex((day) => day.selected));
  const visibleDays = useMemo(() => {
    if (!isMobile || days.length <= 3) return days;
    const start = Math.max(0, Math.min(selectedIndex - 1, Math.max(0, days.length - 3)));
    return days.slice(start, start + 3);
  }, [days, isMobile, selectedIndex]);

  return (
    <div className="calendar-week stack-sm">
      <div className="calendar-range calendar-range--compact">
        <button type="button" className="btn-sm" aria-label={previousWeekAriaLabel} onClick={onPreviousWeek}>
          ←
        </button>
        <div className="calendar-range-info">
          <strong>
            {weekLabel} {weekNumber}
          </strong>
          <span className="muted">{weekRangeLabel}</span>
        </div>
        <button type="button" className="btn-sm" aria-label={nextWeekAriaLabel} onClick={onNextWeek} disabled={nextWeekDisabled}>
          →
        </button>
      </div>

      {hasWeeklyMeals ? (
        <WeekGridCompact
          days={visibleDays.map((day) => ({
            id: day.id,
            label: day.label,
            date: day.date,
            selected: day.selected,
            complete: false,
          }))}
          onSelect={(dayId) => {
            if (typeof dayId !== "string") return;
            onSelectDay(dayId);
          }}
          className="nutrition-week-grid-v2"
        />
      ) : (
        <div className="empty-state">
          <h3 className="m-0">{emptyTitle}</h3>
          <p className="muted">{emptySubtitle}</p>
          {emptyActions ? <div className="inline-actions-sm mt-12">{emptyActions}</div> : null}
        </div>
      )}

      <div className="nutrition-week-grid-kpis" data-testid="nutrition-week-kpis">
        {visibleDays.map((day) => (
          <button key={`${day.id}-meta`} type="button" className={`nutrition-week-kpi ${day.selected ? "is-selected" : ""}`} aria-label={selectWeekDayAria(day)} onClick={() => onSelectDay(day.id)}>
            <span className="nutrition-week-kpi-dots">{"• ".repeat(Math.min(day.mealCount, 4)).trim() || "—"}</span>
            <span className="nutrition-week-kpi-kcal">
              {Math.round(day.dayCalories)} {kcalLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type { WeeklyCalendarDay };
