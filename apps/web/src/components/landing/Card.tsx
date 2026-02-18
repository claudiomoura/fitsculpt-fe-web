import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn("landing-card", className)} {...props} />;
}
