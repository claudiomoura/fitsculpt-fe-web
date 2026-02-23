import Image from 'next/image';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type MealCardCompactProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  kcal: ReactNode;
  imageSrc: string;
  imageAlt: string;
};

export function MealCardCompact({ title, subtitle, kcal, imageSrc, imageAlt, className, ...props }: MealCardCompactProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left',
        'hover:-translate-y-px active:scale-[0.98]',
        className,
      )}
      style={{ boxShadow: elevation.sm, transition: createTransition('interactive') }}
      {...props}
    >
      <Image src={imageSrc} alt={imageAlt} width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold text-text">{title}</p>
        {subtitle ? <p className="m-0 mt-1 truncate text-xs text-text-muted">{subtitle}</p> : null}
        <p className="m-0 mt-2 text-xs font-medium text-primary">{kcal} kcal</p>
      </div>
      <span className="text-text-muted" aria-hidden>
        ›
      </span>
    </button>
  );
}
