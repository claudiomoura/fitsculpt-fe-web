"use client";

import { Icon } from "@/design-system/components/Icon";
import type { ReactNode } from "react";
import styles from "./WeeklyCalendar.module.css";

type WeeklyCalendarDay = {
  id: string;
  label: string;
  date: string;
  selected: boolean;
  mealCount: number;
  dayCalories: number;
  complete?: boolean;
  completedMeals?: number;
};

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
  return (
    <div className="calendar-week stack-sm">
      <div className={`calendar-range ${styles.rangeCompact}`}>
        <button type="button" className={styles.navButton} aria-label={previousWeekAriaLabel} onClick={onPreviousWeek}>
          <Icon name="chevron-left" size={16} />
        </button>
        <div className={styles.rangeInfo}>
          <strong>
            {weekLabel} {weekNumber}
          </strong>
          <span className="muted">{weekRangeLabel}</span>
        </div>
        <button type="button" className={styles.navButton} aria-label={nextWeekAriaLabel} onClick={onNextWeek} disabled={nextWeekDisabled}>
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      <div className="training-week-strip nutrition-week-strip" data-testid="nutrition-week-kpis">
        {days.map((day) => {
          const state = day.complete ? "done" : day.mealCount > 0 ? "planned" : "rest";
          return (
            <button
              key={day.id}
              type="button"
              className={`training-week-pill state-${state} ${day.selected ? "is-selected" : ""}`}
              aria-label={selectWeekDayAria(day)}
              onClick={() => onSelectDay(day.id)}
            >
              <span className="training-week-pill-label">{day.label}</span>
              <div className="training-week-pill-icon" aria-hidden="true">
                {state === "done" ? "✓" : state === "planned" ? "○" : "-"}
              </div>
              <span className="training-week-pill-date">{day.date}</span>
            </button>
          );
        })}
      </div>

      {!hasWeeklyMeals ? (
        <div className="empty-state">
          <h3 className="m-0">{emptyTitle}</h3>
          <p className="muted">{emptySubtitle}</p>
          {emptyActions ? <div className="inline-actions-sm mt-12">{emptyActions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export type { WeeklyCalendarDay };
