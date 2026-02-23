import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type AccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
  subtitle?: ReactNode;
};

export type AccordionProps = HTMLAttributes<HTMLDivElement> & {
  items: AccordionItem[];
  defaultOpenId?: string;
};

export function Accordion({ items, defaultOpenId, className, ...props }: AccordionProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {items.map((item) => {
        const expandedByDefault = item.id === defaultOpenId;

        return (
          <details
            key={item.id}
            className="group overflow-hidden rounded-xl bg-surface"
            style={{ boxShadow: elevation.sm }}
            open={expandedByDefault}
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left hover:-translate-y-px"
              style={{ transition: createTransition('interactive') }}
            >
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold text-text">{item.title}</p>
                {item.subtitle ? <p className="m-0 mt-1 text-xs text-text-muted">{item.subtitle}</p> : null}
              </div>
              <span
                className="text-text-muted transition-transform duration-150 ease group-open:rotate-180"
                style={{ transition: createTransition('transform') }}
                aria-hidden
              >
                ˅
              </span>
            </summary>
            <div className="border-t border-border-subtle px-4 py-3 text-sm text-text-muted">{item.content}</div>
          </details>
        );
      })}
    </div>
  );
}
