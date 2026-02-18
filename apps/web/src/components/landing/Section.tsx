import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

export type SectionProps = HTMLAttributes<HTMLElement>;

export function Section({ className, ...props }: SectionProps) {
  return <section className={cn("landing-section", className)} {...props} />;
}
