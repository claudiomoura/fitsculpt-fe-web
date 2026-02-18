import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

export type LandingButtonVariant = "primary" | "secondary" | "ghost";
export type LandingButtonSize = "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LandingButtonVariant;
  size?: LandingButtonSize;
};

const VARIANT_CLASS: Record<LandingButtonVariant, string> = {
  primary: "landing-button--primary",
  secondary: "landing-button--secondary",
  ghost: "landing-button--ghost",
};

const SIZE_CLASS: Record<LandingButtonSize, string> = {
  md: "landing-button--md",
  lg: "landing-button--lg",
};

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn("landing-button", VARIANT_CLASS[variant], SIZE_CLASS[size], className)} {...props} />;
}
