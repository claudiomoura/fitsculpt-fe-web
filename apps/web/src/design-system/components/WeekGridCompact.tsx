import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type WeekGridCompactDay = {
  id: string;
  label: ReactNode;
  date: ReactNode;
  selected?: boolean;
  complete?: boolean;
};

export type WeekGridCompactProps = HTMLAttributes<HTMLDivElement> & {
  days: WeekGridCompactDay[];
  onSelect?: (id: string) => void;
};

export function WeekGridCompact({ days, onSelect, className, ...props }: WeekGridCompactProps) {
  return (
    <div className={cn('grid grid-cols-7 gap-2', className)} {...props}>
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          onClick={() => onSelect?.(day.id)}
          aria-pressed={day.selected}
          className={cn(
            'flex h-[88px] flex-col items-center justify-center rounded-xl bg-surface px-2 text-center',
            'hover:-translate-y-px active:scale-[0.98]',
            day.selected ? 'bg-primary text-bg' : 'text-text',
          )}
          style={{ boxShadow: elevation.sm, transition: createTransition('interactive') }}
        >
          <span className={cn('text-xs', day.selected ? 'text-bg/85' : 'text-text-muted')}>{day.label}</span>
          <span className="mt-1 text-base font-semibold">{day.date}</span>
          {day.complete ? <span className={cn('mt-1 text-[10px] font-medium', day.selected ? 'text-bg/85' : 'text-success')}>Done</span> : null}
        </button>
      ))}
    </div>
  );
}
