import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

export type BadgeVariant = 'pro' | 'muscleTag';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  icon?: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  pro: 'ui-badge ui-badge--info text-primary',
  muscleTag: 'ui-badge ui-badge--warning text-text',
};

export function Badge({ variant = 'pro', icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
