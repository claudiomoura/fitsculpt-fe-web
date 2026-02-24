import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

export type BadgeVariant = 'pro' | 'muscleTag';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  icon?: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  pro: 'border border-primary/25 bg-primary/10 text-primary',
  muscleTag: 'border border-warning/35 bg-warning/15 text-text',
};

export function Badge({ variant = 'pro', icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold tracking-wide',
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
