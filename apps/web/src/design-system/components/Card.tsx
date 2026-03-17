import type { HTMLAttributes } from "react";
import { Card as BaseCard } from "@/components/ui/Card";
import { cn } from "@/lib/classNames";

export type CardVariant = "default" | "elevated" | "glass";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  hoverable?: boolean;
};

const variantClasses: Record<CardVariant, string> = {
  default: "border-border",
  elevated: "shadow-md border-border/80",
  glass: "glass-card",
};

export function Card({ variant = "default", hoverable = false, className, ...props }: CardProps) {
  return <BaseCard className={cn(variantClasses[variant], hoverable && "card-hover", className)} {...props} />;
}
