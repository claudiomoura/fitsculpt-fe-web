import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/classNames';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'primaryGlow' | 'accentGlow';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'ui-button ui-button--primary bg-primary text-white',
  secondary: 'ui-button ui-button--secondary border border-border bg-surface text-text',
  ghost: 'ui-button ui-button--ghost bg-transparent text-text',
  primaryGlow: 'ui-button ui-button--primary bg-primary text-white glow-primary',
  accentGlow: 'ui-button ui-button--secondary border border-border bg-surface text-text glow-accent',
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
        'focus-visible:outline-none',
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
