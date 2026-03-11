import { cn } from "@/lib/classNames";

type V0ProgressBarProps = {
  value?: number;
  total?: number;
  label?: string;
  className?: string;
};

function getProgress(value?: number, total?: number) {
  const safeTotal = typeof total === "number" && total > 0 ? total : 100;
  const safeValue = typeof value === "number" ? value : 0;
  const progress = (safeValue / safeTotal) * 100;

  return Math.min(Math.max(progress, 0), 100);
}

export function V0ProgressBar({ value, total, label, className }: V0ProgressBarProps) {
  const progress = getProgress(value, total);

  return (
    <section className={cn("v0-progress", className)} aria-label={label ?? "Progreso"}>
      {(label ?? typeof value === "number") && (
        <header className="v0-progress__meta">
          {label && <span>{label}</span>}
          {typeof value === "number" && <strong>{Math.round(progress)}%</strong>}
        </header>
      )}
      <div
        className="v0-progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className="v0-progress__fill" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}

export type { V0ProgressBarProps };
