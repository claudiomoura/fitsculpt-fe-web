import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { Stack } from './Stack';

type StatTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const toneClasses: Record<StatTone, string> = {
  neutral: 'text-text-muted',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export type StatCardProps = HTMLAttributes<HTMLElement> & {
  label: string;
  value: ReactNode;
  supportingText?: string;
  trend?: ReactNode;
  trendTone?: StatTone;
  icon?: ReactNode;
  footer?: ReactNode;
};

export function StatCard({
  label,
  value,
  supportingText,
  trend,
  trendTone = 'neutral',
  icon,
  footer,
  className,
  ...props
}: StatCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-surface p-6',
        'transition-transform duration-150 ease-out hover:-translate-y-px',
        className,
      )}
      style={{ boxShadow: elevation.sm }}
      {...props}
    >
      <Stack gap="4">
        <div className="flex items-start justify-between gap-4">
          <Stack gap="2">
            <p className="m-0 text-sm font-medium text-text-muted">{label}</p>
            <p className="m-0 text-3xl font-semibold leading-tight text-text">{value}</p>
            {supportingText ? <p className="m-0 text-sm text-text-muted">{supportingText}</p> : null}
          </Stack>
          {icon ? <div className="shrink-0 text-text-muted">{icon}</div> : null}
        </div>
        {trend ? <p className={cn('m-0 text-sm font-medium', toneClasses[trendTone])}>{trend}</p> : null}
        {footer ? <div className="border-t border-border-subtle pt-4">{footer}</div> : null}
      </Stack>
    </section>
  );
}
