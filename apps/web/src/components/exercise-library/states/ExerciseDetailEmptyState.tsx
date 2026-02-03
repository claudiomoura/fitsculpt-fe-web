import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";

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
  return (
    <Card className="centered-card">
      <div className="empty-state">
        <div className="empty-state-icon">
          <Icon name="info" />
        </div>
        <div>
          <h3 className="m-0">{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actionLabel && actionHref ? (
          <ButtonLink href={actionHref} className="fit-content">
            {actionLabel}
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}
