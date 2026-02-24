import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

export type CardVariant = 'default' | 'elevated';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default: 'border border-border bg-surface',
  elevated: 'border border-border/80 bg-surface shadow-md',
};

export function Card({ variant = 'default', className, ...props }: CardProps) {
  return <div className={cn('rounded-xl p-4', variantClasses[variant], className)} {...props} />;
}
