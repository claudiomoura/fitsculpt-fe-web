import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

export type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn("landing-container", className)} {...props} />;
}
