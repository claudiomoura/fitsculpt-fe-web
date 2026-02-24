import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';

export type ExerciseCardVariant = 'default' | 'active' | 'completed';

export type ExerciseCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  progress?: number;
  variant?: ExerciseCardVariant;
};

const variantClasses: Record<ExerciseCardVariant, string> = {
  default: 'border-border bg-surface hover:bg-surface-muted/40',
  active: 'border-primary/45 bg-primary/5',
  completed: 'border-success/45 bg-success/10',
};

export function ExerciseCard({
  title,
  subtitle,
  detail,
  progress,
  variant = 'default',
  className,
  ...props
}: ExerciseCardProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex min-h-11 w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-text">{title}</p>
          {subtitle ? <p className="m-0 mt-1 text-xs text-text-muted">{subtitle}</p> : null}
        </div>
        {variant === 'completed' ? <Badge variant="pro">Done</Badge> : null}
      </div>
      {detail ? <p className="m-0 text-xs text-text-muted">{detail}</p> : null}
      {typeof progress === 'number' ? <ProgressBar value={progress} max={100} variant={variant === 'completed' ? 'complete' : 'default'} /> : null}
    </button>
  );
}
