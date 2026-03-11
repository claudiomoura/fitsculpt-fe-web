import type { ReactNode } from "react";

type V0EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function V0EmptyState({
  title,
  description,
  icon,
  actions,
  className,
}: V0EmptyStateProps) {
  return (
    <section
      className={`rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center ${className ?? ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xl text-white/85">
        {icon ?? "📭"}
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-[56ch] text-sm text-white/70">{description}</p> : null}
      {actions ? <div className="mt-5 flex justify-center">{actions}</div> : null}
    </section>
  );
}
