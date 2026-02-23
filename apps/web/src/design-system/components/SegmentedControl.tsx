'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type SegmentedOption = {
  id: string;
  label: string;
};

export type SegmentedControlProps = HTMLAttributes<HTMLDivElement> & {
  options: SegmentedOption[];
  activeId: string;
  onChange?: (id: string) => void;
};

export function SegmentedControl({ options, activeId, onChange, className, ...props }: SegmentedControlProps) {
  return (
    <div className={cn('inline-flex rounded-full bg-surface-muted p-1', className)} {...props}>
      {options.map((option) => {
        const isActive = option.id === activeId;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange?.(option.id)}
            aria-pressed={isActive}
            className={cn(
              'relative rounded-full px-4 py-1.5 text-sm font-medium outline-none',
              'hover:-translate-y-px active:scale-[0.98]',
              isActive ? 'bg-surface text-text' : 'text-text-muted',
            )}
            style={{
              transition: createTransition('interactive'),
              boxShadow: isActive ? elevation.sm : undefined,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
