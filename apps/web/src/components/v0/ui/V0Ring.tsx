import { cn } from "@/lib/classNames";

type V0RingProps = {
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

export function V0Ring({ value, total, label, className }: V0RingProps) {
  const progress = getProgress(value, total);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <figure className={cn("v0-ring", className)} aria-label={label ?? "Progreso"}>
      <svg className="v0-ring__svg" viewBox="0 0 72 72" role="img" aria-hidden="true">
        <circle className="v0-ring__track" cx="36" cy="36" r={radius} />
        <circle
          className="v0-ring__progress"
          cx="36"
          cy="36"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <figcaption className="v0-ring__center">
        <strong>{Math.round(progress)}%</strong>
        {label && <span>{label}</span>}
      </figcaption>
    </figure>
  );
}

export type { V0RingProps };
