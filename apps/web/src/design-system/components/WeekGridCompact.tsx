'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type WeekGridCompactDay = {
  id: string;
  label: string;
  date: string;
  isToday?: boolean;
  isSelected?: boolean;
  hasMeals?: boolean;
};

export type WeekGridCompactProps = HTMLAttributes<HTMLDivElement> & {
  days: WeekGridCompactDay[];
  onSelectDay?: (id: string) => void;
};

export function WeekGridCompact({ days, onSelectDay, className, ...props }: WeekGridCompactProps) {
  return (
    <div className={cn('grid grid-cols-7 gap-2', className)} {...props}>
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          onClick={() => onSelectDay?.(day.id)}
          className={cn(
            'flex h-[88px] flex-col items-center justify-center rounded-xl bg-surface px-1 text-center',
            'hover:-translate-y-px active:scale-[0.98]',
            day.isSelected ? 'text-primary' : 'text-text',
          )}
          style={{
            transition: createTransition('interactive'),
            boxShadow: day.isSelected ? elevation.md : elevation.sm,
          }}
          aria-current={day.isToday ? 'date' : undefined}
          aria-pressed={day.isSelected}
        >
          <span className={cn('text-xs font-medium uppercase tracking-wide', day.isToday ? 'text-primary' : 'text-text-muted')}>
            {day.label}
          </span>
          <span className="mt-1 text-lg font-semibold leading-none">{day.date}</span>
          <span
            className={cn(
              'mt-2 h-1.5 w-1.5 rounded-full',
              day.hasMeals ? (day.isSelected ? 'bg-primary' : 'bg-success') : 'bg-border',
            )}
          />
        </button>
      ))}
    </div>
  );
}
