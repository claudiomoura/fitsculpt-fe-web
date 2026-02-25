import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { Stack } from './Stack';

type PanelTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const accentClasses: Record<PanelTone, string> = {
  neutral: 'bg-border-default',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export type InsightPanelProps = HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: PanelTone;
  aside?: ReactNode;
};

export function InsightPanel({
  title,
  description,
  action,
  tone = 'neutral',
  aside,
  className,
  children,
  ...props
}: InsightPanelProps) {
  return (
    <section
      className={cn('relative overflow-hidden rounded-2xl border border-border bg-surface p-6', className)}
      style={{ boxShadow: elevation.md }}
      {...props}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1', accentClasses[tone])} aria-hidden="true" />
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <Stack gap="3" className="min-w-0 flex-1">
          <h3 className="m-0 text-lg font-semibold text-text">{title}</h3>
          {description ? <p className="m-0 text-sm text-text-muted">{description}</p> : null}
          {children}
          {action ? <div>{action}</div> : null}
        </Stack>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}
