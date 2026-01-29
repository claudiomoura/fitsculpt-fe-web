import Link from "next/link";
import type { ComponentPropsWithoutRef, ElementType } from "react";
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
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("ui-button", VARIANT_CLASS[variant], SIZE_CLASS[size], loading && "is-loading", className)}
      disabled={disabled || loading}
      aria-busy={loading}
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
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {children}
    </Component>
  );
}
