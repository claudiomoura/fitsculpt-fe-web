import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/classNames";

type V0CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function V0Card({ className, children, ...props }: V0CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur md:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
