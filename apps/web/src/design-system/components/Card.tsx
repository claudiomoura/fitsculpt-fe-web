import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

export type CardVariant = 'default' | 'elevated' | 'glass';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  hoverable?: boolean;
};

const variantClasses: Record<CardVariant, string> = {
  default: 'border border-border bg-surface',
  elevated: 'border border-border/80 bg-surface shadow-md',
  glass: 'glass-card',
};

export function Card({ variant = 'default', hoverable = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl p-4', variantClasses[variant], hoverable && 'card-hover', className)}
      {...props}
    />
  );
}
