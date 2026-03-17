import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/classNames";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "danger" | "info" | "muted" | "pro" | "muscleTag";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  icon?: ReactNode;
};

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: "",
  success: "ui-badge--success",
  warning: "ui-badge--warning",
  error: "ui-badge--error",
  danger: "ui-badge--error",
  info: "ui-badge--info",
  muted: "ui-badge--muted",
  pro: "ui-badge--info text-primary",
  muscleTag: "ui-badge--warning text-text",
};

export function Badge({ variant = "default", icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn("ui-badge inline-flex min-h-6 items-center gap-1", VARIANT_CLASS[variant], className)} {...props}>
      {icon}
      {children}
    </span>
  );
}
