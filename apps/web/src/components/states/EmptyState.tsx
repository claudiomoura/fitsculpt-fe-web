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

type EmptyStateVariant = "default" | "premium" | "minimal";

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
  variant?: EmptyStateVariant;
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
  variant = "default",
}: EmptyStateProps) {
  const isPremium = variant === "premium";
  const isMinimal = variant === "minimal";

  const content = (
    <section
      className={cn(
        "empty-state form-stack",
        isPremium && "empty-state--premium",
        isMinimal && "empty-state--minimal",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {!isMinimal && (
        <div className={cn("empty-state-icon", isPremium && "empty-state-icon--premium")}>
          <Icon name={icon} />
        </div>
      )}
      <div>
        <h2 className={cn("empty-state-title", isPremium && "empty-state-title--premium")}>{title}</h2>
        {description ? <p className={cn("muted", isPremium && "empty-state-description--premium")}>{description}</p> : null}
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
