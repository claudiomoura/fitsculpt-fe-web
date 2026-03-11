import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";

type V0StatRowProps = {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function V0StatRow({
  label,
  value,
  helper,
  icon,
  className,
}: V0StatRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-wide text-white/60">
          {label}
        </p>
        <p className="mt-1 text-base font-semibold text-white md:text-lg">
          {value}
        </p>
        {helper ? <p className="mt-1 text-xs text-white/60">{helper}</p> : null}
      </div>
      {icon ? <div className="shrink-0 text-white/80">{icon}</div> : null}
    </div>
  );
}
