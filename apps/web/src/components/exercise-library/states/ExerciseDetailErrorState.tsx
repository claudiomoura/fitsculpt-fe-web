import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink, Button } from "@/components/ui/Button";

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
  return (
    <Card className="centered-card">
      <div className="empty-state">
        <div className="empty-state-icon">
          <Icon name="warning" />
        </div>
        <div>
          <h3 className="m-0">{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        <div className="empty-state-actions">
          {actionLabel && actionHref ? (
            <ButtonLink href={actionHref} className="fit-content">
              {actionLabel}
            </ButtonLink>
          ) : null}
          {onRetry && retryLabel ? (
            <Button variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
