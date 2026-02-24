import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary/90 focus-visible:ring-primary/35',
  secondary:
    'border border-border bg-surface text-text shadow-sm hover:bg-surface-muted focus-visible:ring-primary/25',
  ghost:
    'bg-transparent text-text hover:bg-surface-muted focus-visible:ring-primary/20',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  iconLeft,
  iconRight,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        variantClasses[variant],
        isDisabled && 'cursor-not-allowed opacity-55',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading ? iconRight : null}
    </button>
  );
}
