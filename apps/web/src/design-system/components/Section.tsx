import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/classNames";

export type SectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Section({ title, description, actions, children, className, ...props }: SectionProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section className={cn("space-y-4 md:space-y-5", className)} {...props}>
      {hasHeader ? (
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="m-0 text-lg font-semibold text-slate-100 md:text-xl">{title}</h2> : null}
            {description ? <p className="m-0 text-sm text-slate-300">{description}</p> : null}
          </div>
          {actions ? <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
