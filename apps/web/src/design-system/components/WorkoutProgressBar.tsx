import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { createTransition } from '../motion';

export type WorkoutProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  label?: ReactNode;
  valueLabel?: ReactNode;
};

export function WorkoutProgressBar({ value, max = 100, label, valueLabel, className, ...props }: WorkoutProgressBarProps) {
  const normalizedMax = Math.max(max, 1);
  const clampedValue = Math.max(0, Math.min(value, normalizedMax));
  const progress = Math.round((clampedValue / normalizedMax) * 100);

  return (
    <div className={cn('w-full', className)} {...props}>
      {(label || valueLabel) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label ? <span className="text-xs font-medium text-text-muted">{label}</span> : <span aria-hidden />}
          {valueLabel ? <span className="text-xs font-semibold text-text">{valueLabel}</span> : <span className="text-xs font-semibold text-text">{progress}%</span>}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={normalizedMax} aria-valuenow={clampedValue}>
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress}%`, transition: createTransition('interactive', ['width', 'background-color']) }}
        />
      </div>
    </div>
  );
}
