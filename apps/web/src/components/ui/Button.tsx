import Link from "next/link";
import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react";
import { cn } from "@/lib/classNames";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "ui-button--primary",
  secondary: "ui-button--secondary",
  ghost: "ui-button--ghost",
  danger: "ui-button--danger",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "ui-button--sm",
  md: "",
  lg: "ui-button--lg",
};

const PREMIUM_BASE_STYLE: CSSProperties = {
  minHeight: "50px",
  borderRadius: "14px",
};

const PREMIUM_VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%)",
    borderColor: "rgba(14, 165, 233, 0.36)",
    boxShadow: "0 8px 18px rgba(14, 165, 233, 0.18)",
    color: "#f8fafc",
  },
  secondary: {
    background: "color-mix(in srgb, var(--bg-card) 84%, #2dd4bf 16%)",
    borderColor: "color-mix(in srgb, var(--border) 48%, #0ea5e9 52%)",
    color: "color-mix(in srgb, var(--text-primary) 82%, #0f766e 18%)",
    boxShadow: "0 6px 14px rgba(14, 165, 233, 0.1)",
  },
  ghost: {},
  danger: {},
};

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  type = "button",
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("ui-button", VARIANT_CLASS[variant], SIZE_CLASS[size], loading && "is-loading", className)}
      disabled={disabled || loading}
      aria-busy={loading}
      style={{ ...PREMIUM_BASE_STYLE, ...PREMIUM_VARIANT_STYLE[variant], ...style }}
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps<T extends ElementType> = {
  as?: T;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
} & ComponentPropsWithoutRef<T>;

export function ButtonLink<T extends ElementType = typeof Link>({
  as,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  style,
  children,
  ...props
}: ButtonLinkProps<T>) {
  const Component = (as ?? Link) as ElementType;
  const isDisabled = disabled || loading;

  return (
    <Component
      className={cn("ui-button", VARIANT_CLASS[variant], SIZE_CLASS[size], loading && "is-loading", className)}
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : undefined}
      style={{ ...PREMIUM_BASE_STYLE, ...PREMIUM_VARIANT_STYLE[variant], ...style }}
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {children}
    </Component>
  );
}
