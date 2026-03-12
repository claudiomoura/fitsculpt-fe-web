import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/classNames";

export type PageHeroProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageHero({ title, subtitle, eyebrow, actions, children, className, ...props }: PageHeroProps) {
  return (
    <header
      className={cn(
        "hero-glow gradient-bg rounded-3xl border border-white/10 px-4 py-5 shadow-[0_22px_50px_rgba(0,0,0,0.35)] md:px-6 md:py-6",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow ? (
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-accent">{eyebrow}</p>
          ) : null}
          <h1 className="m-0 text-2xl font-semibold text-slate-100 md:text-3xl">{title}</h1>
          {subtitle ? <p className="m-0 text-sm text-slate-300 md:text-base">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">{actions}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}
