import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/classNames";

type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: IconName;
  actions?: StateAction[];
  className?: string;
  wrapInCard?: boolean;
  cardClassName?: string;
  children?: ReactNode;
  ariaLabel?: string;
};

function renderActions(actions?: StateAction[]) {
  if (!actions?.length) {
    return null;
  }

  return (
    <div className="empty-state-actions">
      {actions.map((action, index) => {
        if (action.href) {
          return (
            <ButtonLink
              key={`${action.label}-${index}`}
              href={action.href}
              variant={action.variant}
              className={action.className}
              aria-disabled={action.disabled}
              tabIndex={action.disabled ? -1 : undefined}
            >
              {action.label}
            </ButtonLink>
          );
        }

        if (action.onClick) {
          return (
            <Button
              key={`${action.label}-${index}`}
              variant={action.variant}
              onClick={action.onClick}
              className={action.className}
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          );
        }

        return null;
      })}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon = "info",
  actions,
  className,
  wrapInCard = false,
  cardClassName,
  children,
  ariaLabel,
}: EmptyStateProps) {
  const content = (
    <section className={cn("empty-state form-stack", className)} role="status" aria-live="polite" aria-label={ariaLabel}>
      <div className="empty-state-icon">
        <Icon name={icon} />
      </div>
      <div>
        <h2 className="m-0">{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
        {children}
      </div>
      {renderActions(actions)}
    </section>
  );

  if (!wrapInCard) {
    return content;
  }

  return <Card className={cn("centered-card", cardClassName)}>{content}</Card>;
}
