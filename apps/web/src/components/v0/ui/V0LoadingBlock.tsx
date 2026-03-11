import { cn } from "@/lib/classNames";

type V0LoadingBlockProps = {
  title?: string;
  lines?: number;
  className?: string;
  ariaLabel?: string;
};

export function V0LoadingBlock({
  title = "Cargando...",
  lines = 3,
  className,
  ariaLabel = "Cargando contenido",
}: V0LoadingBlockProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <p className="mb-3 text-sm font-medium text-white/80">{title}</p>

      <div className="space-y-2.5">
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/15" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
        {Array.from({ length: Math.max(1, lines) }).map((_, index) => (
          <div
            key={`v0-loading-line-${index}`}
            className={cn(
              "h-3 animate-pulse rounded bg-white/10",
              index % 2 === 0 ? "w-5/6" : "w-3/4",
            )}
          />
        ))}
      </div>
    </section>
  );
}
