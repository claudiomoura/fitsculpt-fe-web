import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { Badge } from './Badge';

export type MealCardVariant = 'default' | 'selected';

export type MealCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  calories?: ReactNode;
  protein?: ReactNode;
  variant?: MealCardVariant;
};

const variantClasses: Record<MealCardVariant, string> = {
  default: 'border-border bg-surface hover:bg-surface-muted/40',
  selected: 'border-primary/45 bg-primary/5',
};

export function MealCard({ title, subtitle, calories, protein, variant = 'default', className, ...props }: MealCardProps) {
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-text">{title}</p>
          {subtitle ? <p className="m-0 mt-1 text-xs text-text-muted">{subtitle}</p> : null}
        </div>
        {variant === 'selected' ? <Badge variant="muscleTag">Selected</Badge> : null}
      </div>
      <div className="flex gap-3 text-xs text-text-muted">
        {calories ? <span>{calories} kcal</span> : null}
        {protein ? <span>{protein} protein</span> : null}
      </div>
    </button>
  );
}
