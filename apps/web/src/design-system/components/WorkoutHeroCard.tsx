import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { createTransition } from '../motion';

export type WorkoutHeroCardProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  cta?: ReactNode;
  badge?: ReactNode;
};

export function WorkoutHeroCard({ title, subtitle, meta, cta, badge, className, ...props }: WorkoutHeroCardProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-4 text-bg md:p-5',
        className,
      )}
      style={{ boxShadow: elevation.md, transition: createTransition('interactive') }}
      {...props}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-bg/10" aria-hidden />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-bg/10" aria-hidden />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xl font-semibold leading-tight md:text-2xl">{title}</p>
          {subtitle ? <p className="m-0 mt-1 text-sm text-bg/90">{subtitle}</p> : null}
          {meta ? <p className="m-0 mt-3 text-xs font-medium uppercase tracking-wide text-bg/80">{meta}</p> : null}
        </div>
        {badge ? <div className="shrink-0 rounded-full bg-bg/15 px-2.5 py-1 text-xs font-medium">{badge}</div> : null}
      </div>

      {cta ? <div className="relative z-10 mt-4">{cta}</div> : null}
    </section>
  );
}
