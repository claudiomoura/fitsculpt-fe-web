import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { Stack } from './Stack';

export type HeaderCompactProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function HeaderCompact({
  title,
  subtitle,
  eyebrow,
  leading,
  trailing,
  className,
  ...props
}: HeaderCompactProps) {
  return (
    <header className={cn('flex items-start justify-between gap-3', className)} {...props}>
      <div className="flex min-w-0 items-start gap-3">
        {leading ? <div className="mt-1 shrink-0 text-text-muted">{leading}</div> : null}
        <Stack gap="1">
          {eyebrow ? <p className="m-0 text-xs font-semibold uppercase tracking-wide text-text-muted">{eyebrow}</p> : null}
          <h2 className="m-0 text-lg font-semibold leading-tight text-text">{title}</h2>
          {subtitle ? <p className="m-0 text-sm text-text-muted">{subtitle}</p> : null}
        </Stack>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
