import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { createTransition } from '../motion';

export type PeriodizationTimelinePhase = {
  id: string;
  label: ReactNode;
  weeks: number;
  intensity?: 'low' | 'medium' | 'high' | 'deload';
  selected?: boolean;
};

export type PeriodizationTimelineProps = HTMLAttributes<HTMLDivElement> & {
  phases: PeriodizationTimelinePhase[];
  onSelect?: (id: string) => void;
};

const intensityStyles: Record<NonNullable<PeriodizationTimelinePhase['intensity']>, string> = {
  low: 'bg-primary/30',
  medium: 'bg-primary/55',
  high: 'bg-primary',
  deload: 'bg-info/60',
};

export function PeriodizationTimeline({ phases, onSelect, className, ...props }: PeriodizationTimelineProps) {
  const totalWeeks = Math.max(
    phases.reduce((sum, phase) => sum + Math.max(phase.weeks, 1), 0),
    1,
  );

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-medium uppercase tracking-wide text-text-muted">Plan timeline</p>
        <p className="m-0 text-xs font-medium text-text-muted">{totalWeeks} weeks</p>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-muted">
        {phases.map((phase) => {
          const share = (Math.max(phase.weeks, 1) / totalWeeks) * 100;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => onSelect?.(phase.id)}
              aria-pressed={phase.selected}
              className={cn(
                'h-full hover:-translate-y-px active:scale-[0.98]',
                phase.intensity ? intensityStyles[phase.intensity] : intensityStyles.medium,
                phase.selected ? 'ring-2 ring-bg/90 ring-offset-0' : undefined,
              )}
              style={{ width: `${share}%`, transition: createTransition('interactive') }}
            >
              <span className="sr-only">{phase.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {phases.map((phase) => (
          <button
            key={`${phase.id}-label`}
            type="button"
            onClick={() => onSelect?.(phase.id)}
            aria-pressed={phase.selected}
            className={cn(
              'rounded-lg bg-surface px-2 py-1.5 text-left text-xs text-text-muted',
              'hover:-translate-y-px active:scale-[0.98]',
              phase.selected && 'text-text',
            )}
            style={{ transition: createTransition('interactive') }}
          >
            <span className="block truncate font-medium">{phase.label}</span>
            <span className="block text-[11px]">{phase.weeks}w</span>
          </button>
        ))}
      </div>
    </div>
  );
}
