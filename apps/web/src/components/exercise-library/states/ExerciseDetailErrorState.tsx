import { ErrorState } from "./ErrorState";

type ExerciseDetailErrorStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ExerciseDetailErrorState({
  title,
  description,
  actionLabel,
  actionHref,
  onRetry,
  retryLabel,
}: ExerciseDetailErrorStateProps) {
  const actions = [
    actionLabel && actionHref ? { label: actionLabel, href: actionHref, className: "fit-content" } : null,
    onRetry && retryLabel
      ? { label: retryLabel, onClick: onRetry, variant: "secondary" as const, className: "fit-content" }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    className?: string;
  }>;

  return (
    <ErrorState
      title={title}
      description={description}
      actions={actions.length > 0 ? actions : undefined}
      wrapInCard
      cardClassName="centered-card"
    />
  );
}
