import { WeekGridCompact } from "@/design-system/components";

type WeeklyCalendarDay = {
  id: string;
  label: string;
  date: string;
  selected: boolean;
  mealCount: number;
  dayCalories: number;
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
  selectWeekDayAria,
  kcalLabel,
  days,
  onPreviousWeek,
  onNextWeek,
  onSelectDay,
}: WeeklyCalendarProps) {
  return (
    <div className="calendar-week stack-sm">
      <div className="calendar-range">
        <button type="button" className="btn secondary fit-content" aria-label={previousWeekAriaLabel} onClick={onPreviousWeek}>
          {previousWeekLabel}
        </button>
        <div>
          <strong>
            {weekLabel} {weekNumber}
          </strong>
          <span className="muted">{weekRangeLabel}</span>
        </div>
        <button type="button" className="btn secondary fit-content" aria-label={nextWeekAriaLabel} onClick={onNextWeek} disabled={nextWeekDisabled}>
          {nextWeekLabel}
        </button>
      </div>

      {hasWeeklyMeals ? (
        <WeekGridCompact
          days={days.map((day) => ({
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
        </div>
      )}

      {hasWeeklyMeals ? (
        <div className="nutrition-week-grid-kpis">
          {days.map((day) => (
            <button key={`${day.id}-meta`} type="button" className={`nutrition-week-kpi ${day.selected ? "is-selected" : ""}`} aria-label={selectWeekDayAria(day)} onClick={() => onSelectDay(day.id)}>
              <span className="nutrition-week-kpi-dots">{"• ".repeat(Math.min(day.mealCount, 4)).trim() || "—"}</span>
              <span className="nutrition-week-kpi-kcal">
                {Math.round(day.dayCalories)} {kcalLabel}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type { WeeklyCalendarDay };
