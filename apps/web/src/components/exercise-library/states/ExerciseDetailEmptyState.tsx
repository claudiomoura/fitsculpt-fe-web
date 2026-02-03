import { EmptyState } from "./EmptyState";

type ExerciseDetailEmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function ExerciseDetailEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: ExerciseDetailEmptyStateProps) {
  const actions = actionLabel && actionHref ? [{ label: actionLabel, href: actionHref, className: "fit-content" }] : undefined;

  return (
    <EmptyState
      title={title}
      description={description}
      actions={actions}
      wrapInCard
      cardClassName="centered-card"
    />
  );
}
