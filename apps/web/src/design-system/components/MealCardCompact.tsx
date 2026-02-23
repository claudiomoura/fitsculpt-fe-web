'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type MealCardCompactProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  subtitle?: string;
  kcal: number;
  image?: ReactNode;
  chevron?: ReactNode;
};

export function MealCardCompact({
  title,
  subtitle,
  kcal,
  image,
  chevron,
  className,
  type = 'button',
  ...props
}: MealCardCompactProps) {
  return (
    <button
      type={type}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left',
        'hover:-translate-y-px active:scale-[0.98]',
        className,
      )}
      style={{
        transition: createTransition('interactive'),
        boxShadow: elevation.sm,
      }}
      {...props}
    >
      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted text-text-muted">
        {image ?? <span className="text-xs">IMG</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold text-text">{title}</p>
        {subtitle ? <p className="m-0 mt-1 truncate text-xs text-text-muted">{subtitle}</p> : null}
        <p className="m-0 mt-2 text-xs font-medium text-text-muted">{kcal} kcal</p>
      </div>
      <span className="shrink-0 text-text-muted">{chevron ?? '›'}</span>
    </button>
  );
}
