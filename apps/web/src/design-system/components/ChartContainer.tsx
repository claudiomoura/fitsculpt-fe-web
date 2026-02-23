import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

import { elevation } from '../elevation';
import { Stack } from './Stack';

type ChartSize = 'sm' | 'md' | 'lg';

const minHeightClasses: Record<ChartSize, string> = {
  sm: 'min-h-48',
  md: 'min-h-64',
  lg: 'min-h-80',
};

export type ChartContainerProps = HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  action?: ReactNode;
  emptyState?: ReactNode;
  size?: ChartSize;
};

export function ChartContainer({
  title,
  description,
  action,
  emptyState,
  size = 'md',
  className,
  children,
  ...props
}: ChartContainerProps) {
  const hasContent = children != null;

  return (
    <section
      className={cn('rounded-2xl border border-border bg-surface p-6', className)}
      style={{ boxShadow: elevation.sm }}
      {...props}
    >
      <Stack gap="6">
        <div className="flex items-start justify-between gap-4">
          <Stack gap="2">
            <h3 className="m-0 text-lg font-semibold text-text">{title}</h3>
            {description ? <p className="m-0 text-sm text-text-muted">{description}</p> : null}
          </Stack>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className={cn('rounded-xl border border-border-subtle bg-surface-muted p-4', minHeightClasses[size])}>
          {hasContent ? (
            children
          ) : (
            <div
              className="flex h-full min-h-40 items-center justify-center text-sm text-text-muted"
              role="status"
              aria-live="polite"
            >
              {emptyState ?? 'No chart data available.'}
            </div>
          )}
        </div>
      </Stack>
    </section>
  );
}
