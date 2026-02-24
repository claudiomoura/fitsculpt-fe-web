import type { ProgressHTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

export type ProgressBarVariant = 'default' | 'complete';

export type ProgressBarProps = Omit<ProgressHTMLAttributes<HTMLProgressElement>, 'value' | 'max'> & {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
};

export function ProgressBar({ value, max = 100, variant, className, ...props }: ProgressBarProps) {
  const boundedValue = Math.min(Math.max(value, 0), max);
  const effectiveVariant = variant ?? (boundedValue >= max ? 'complete' : 'default');

  return (
    <progress
      value={boundedValue}
      max={max}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-surface-muted [&::-webkit-progress-value]:rounded-full',
        effectiveVariant === 'complete'
          ? '[&::-moz-progress-bar]:bg-success [&::-webkit-progress-value]:bg-success'
          : '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary',
        className,
      )}
      {...props}
    />
  );
}
