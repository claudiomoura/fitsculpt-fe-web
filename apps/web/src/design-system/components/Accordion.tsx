'use client';

import { useState, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type AccordionProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
};

export function Accordion({
  title,
  subtitle,
  defaultOpen = false,
  rightSlot,
  children,
  className,
  ...props
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={cn('overflow-hidden rounded-xl bg-surface', className)}
      style={{
        boxShadow: elevation.sm,
        transition: createTransition('surface'),
      }}
      {...props}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:-translate-y-px active:scale-[0.98]"
        style={{ transition: createTransition('interactive', ['transform', 'color']) }}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-text">{title}</p>
          {subtitle ? <p className="m-0 mt-1 text-xs text-text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          {rightSlot}
          <span className={cn('text-lg leading-none', isOpen ? 'rotate-180' : undefined)} style={{ transition: createTransition('transform') }}>
            ˅
          </span>
        </div>
      </button>
      <div
        className={cn('grid', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        style={{ transition: 'grid-template-rows 150ms ease' }}
      >
        <div className="overflow-hidden px-4 pb-4">{children}</div>
      </div>
    </section>
  );
}
