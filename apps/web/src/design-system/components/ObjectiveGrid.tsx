import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type ObjectiveItem = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  supportingText?: ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'warning';
};

const toneClasses: Record<NonNullable<ObjectiveItem['tone']>, string> = {
  neutral: 'text-text',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
};

export type ObjectiveGridProps = HTMLAttributes<HTMLDivElement> & {
  items: ObjectiveItem[];
};

export function ObjectiveGrid({ items, className, ...props }: ObjectiveGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)} {...props}>
      {items.slice(0, 4).map((item) => (
        <article
          key={item.id}
          className="rounded-xl bg-surface p-3"
          style={{ boxShadow: elevation.sm, transition: createTransition('interactive') }}
        >
          <p className="m-0 text-xs text-text-muted">{item.label}</p>
          <p className={cn('m-0 mt-1 text-base font-semibold leading-tight', toneClasses[item.tone ?? 'neutral'])}>{item.value}</p>
          {item.supportingText ? <p className="m-0 mt-1 text-xs text-text-muted">{item.supportingText}</p> : null}
        </article>
      ))}
    </div>
  );
}
