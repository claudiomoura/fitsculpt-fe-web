import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: "",
  success: "ui-badge--success",
  warning: "ui-badge--warning",
  danger: "ui-badge--danger",
  muted: "ui-badge--muted",
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return <span className={cn("ui-badge", VARIANT_CLASS[variant], className)} {...props} />;
}
