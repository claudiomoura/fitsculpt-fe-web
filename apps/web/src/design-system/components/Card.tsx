import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

export type CardVariant = "default" | "elevated" | "glass";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  hoverable?: boolean;
};

type CardSectionProps = HTMLAttributes<HTMLDivElement>;
type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;
type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

const variantClasses: Record<CardVariant, string> = {
  default: "border-border",
  elevated: "shadow-md border-border/80",
  glass: "glass-card",
};

export function Card({ variant = "default", hoverable = false, className, ...props }: CardProps) {
  return <div className={cn("ui-card", variantClasses[variant], hoverable && "card-hover", className)} {...props} />;
}

export function CardHeader({ className, ...props }: CardSectionProps) {
  return <div className={cn("ui-card-header", className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return <h3 className={cn("ui-card-title", className)} {...props} />;
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={cn("ui-card-description", className)} {...props} />;
}

export function CardContent({ className, ...props }: CardSectionProps) {
  return <div className={cn("ui-card-content", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardSectionProps) {
  return <div className={cn("ui-card-footer", className)} {...props} />;
}
