'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

export type FilterPillItem = {
  id: string;
  label: string;
  count?: number;
};

export type FilterPillsProps = HTMLAttributes<HTMLDivElement> & {
  items: FilterPillItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
};

export function FilterPills({ items, activeId, onSelect, className, ...props }: FilterPillsProps) {
  return (
    <div className={cn('overflow-x-auto', className)} {...props}>
      <div className="flex min-w-full items-center gap-2 pb-1">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              aria-pressed={isActive}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out',
                isActive
                  ? 'border-primary bg-primary text-bg'
                  : 'border-border bg-surface text-text hover:border-border-subtle hover:bg-surface-muted',
              )}
            >
              <span>{item.label}</span>
              {typeof item.count === 'number' ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    isActive ? 'bg-primary-soft text-bg' : 'bg-surface-muted text-text-muted',
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
