import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/classNames';

export type CardVariant = 'default' | 'elevated' | 'glass';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  hoverable?: boolean;
};

const variantClasses: Record<CardVariant, string> = {
  default: 'ui-card border-border bg-surface',
  elevated: 'ui-card border-border/80 bg-surface shadow-md',
  glass: 'glass-card',
};

export function Card({ variant = 'default', hoverable = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(variantClasses[variant], variant === 'elevated' && 'glow-primary', hoverable && 'card-hover', className)}
      {...props}
    />
  );
}
