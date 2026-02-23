import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type ObjectiveGridItem = {
  id: string;
  title: string;
  value: ReactNode;
  supportingText?: ReactNode;
  icon?: ReactNode;
};

export type ObjectiveGridProps = HTMLAttributes<HTMLDivElement> & {
  items: [ObjectiveGridItem, ObjectiveGridItem, ObjectiveGridItem, ObjectiveGridItem] | ObjectiveGridItem[];
};

export function ObjectiveGrid({ items, className, ...props }: ObjectiveGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)} {...props}>
      {items.slice(0, 4).map((item) => (
        <article
          key={item.id}
          className="rounded-xl bg-surface p-3 hover:-translate-y-px"
          style={{
            boxShadow: elevation.sm,
            transition: createTransition('interactive'),
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="m-0 text-xs font-medium uppercase tracking-wide text-text-muted">{item.title}</p>
            {item.icon ? <span className="text-text-muted">{item.icon}</span> : null}
          </div>
          <p className="m-0 mt-2 text-lg font-semibold leading-tight text-text">{item.value}</p>
          {item.supportingText ? <p className="m-0 mt-1 text-xs text-text-muted">{item.supportingText}</p> : null}
        </article>
      ))}
    </div>
  );
}
