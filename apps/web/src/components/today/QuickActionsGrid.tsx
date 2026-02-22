import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";

export type TodayQuickAction = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  ctaLabel: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  disabledHint?: string;
};

type QuickActionsGridProps = {
  actions: TodayQuickAction[];
};

export default function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  return (
    <div className="today-actions-grid">
      {actions.map((action) => {
        const isDisabled = !action.href && !action.onClick;

        return (
          <div key={action.id} className={`feature-card today-action-card ${isDisabled ? "is-disabled" : ""}`}>
            <div className="stack-sm">
              <p className="today-action-title">{action.title}</p>
              <p className="today-action-description">{action.description}</p>
              <p className="today-action-hint">{action.outcome}</p>
              {isDisabled && action.disabledHint ? <p className="today-action-hint">{action.disabledHint}</p> : null}
            </div>
            {action.href ? (
              <ButtonLink as={Link} href={action.href} variant="secondary" size="lg" className="today-action-button">
                {action.ctaLabel}
              </ButtonLink>
            ) : action.onClick ? (
              <Button
                variant="secondary"
                size="lg"
                className="today-action-button"
                onClick={action.onClick}
                loading={action.loading}
              >
                {action.ctaLabel}
              </Button>
            ) : (
              <Button variant="secondary" size="lg" className="today-action-button" disabled>
                {action.ctaLabel}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
