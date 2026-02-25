import type { ReactNode } from 'react';

import { WeekGridCompact, type WeekGridCompactDay, type WeekGridCompactProps } from './WeekGridCompact';

export type TrainingWeekGridCompactDay = WeekGridCompactDay & {
  volume?: ReactNode;
};

export type TrainingWeekGridCompactProps = Omit<WeekGridCompactProps, 'days'> & {
  days: TrainingWeekGridCompactDay[];
};

export function TrainingWeekGridCompact({ days, ...props }: TrainingWeekGridCompactProps) {
  return (
    <WeekGridCompact
      days={days.map((day) => ({
        ...day,
        label: (
          <span className="inline-flex flex-col items-center gap-0.5">
            <span>{day.label}</span>
            {day.volume ? <span className="text-[10px] font-medium">{day.volume}</span> : null}
          </span>
        ),
      }))}
      {...props}
    />
  );
}
