import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/classNames";

type V0CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function V0Card({ className, children, ...props }: V0CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur md:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
