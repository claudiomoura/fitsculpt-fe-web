import type { ReactNode } from "react";
import { V0EmptyState } from "./V0EmptyState";

type V0ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  actions?: ReactNode;
  className?: string;
};

export function V0ErrorState({
  title = "Algo salió mal",
  description = "No pudimos cargar esta sección. Intenta de nuevo en unos segundos.",
  retryLabel = "Reintentar",
  onRetry,
  actions,
  className,
}: V0ErrorStateProps) {
  const retryAction = onRetry ? (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
    >
      {retryLabel}
    </button>
  ) : null;

  return (
    <V0EmptyState
      title={title}
      description={description}
      icon="⚠️"
      actions={
        actions ? (
          <div className="flex flex-wrap items-center justify-center gap-2">{actions}{retryAction}</div>
        ) : (
          retryAction
        )
      }
      className={className}
    />
  );
}
