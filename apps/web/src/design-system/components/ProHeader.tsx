import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { Stack } from './Stack';

export type ProHeaderProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
};

export function ProHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  compact = false,
  className,
  ...props
}: ProHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-end md:justify-between',
        compact ? 'gap-2 pb-3' : undefined,
        className,
      )}
      {...props}
    >
      <Stack gap={compact ? '1' : '2'}>
        {eyebrow ? (
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-text-muted">{eyebrow}</p>
        ) : null}
        <h1 className={cn('m-0 text-2xl font-semibold leading-tight text-text', compact ? 'text-xl' : undefined)}>{title}</h1>
        {subtitle ? (
          <p className={cn('m-0 text-sm text-text-muted', compact ? 'text-xs' : undefined)}>{subtitle}</p>
        ) : null}
      </Stack>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
