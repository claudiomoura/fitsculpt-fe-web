import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { createTransition } from '../motion';

export type HeaderCompactProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function HeaderCompact({ title, subtitle, leading, trailing, className, ...props }: HeaderCompactProps) {
  return (
    <header className={cn('flex items-start justify-between gap-3', className)} {...props}>
      <div className="flex min-w-0 items-start gap-3">
        {leading ? (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text"
            style={{ transition: createTransition('interactive') }}
          >
            {leading}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="m-0 truncate text-lg font-semibold leading-tight text-text">{title}</h2>
          {subtitle ? <p className="m-0 mt-1 text-sm text-text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
