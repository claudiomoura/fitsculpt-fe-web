import { Card } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/classNames";

type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
};

type ErrorStateProps = {
  title: string;
  description?: string;
  icon?: IconName;
  actions?: StateAction[];
  className?: string;
  wrapInCard?: boolean;
  cardClassName?: string;
};

export function ErrorState({
  title,
  description,
  icon = "warning",
  actions,
  className,
  wrapInCard = false,
  cardClassName,
}: ErrorStateProps) {
  const content = (
    <div className={cn("empty-state", className)}>
      <div className="empty-state-icon">
        <Icon name={icon} />
      </div>
      <div>
        <h3 className="m-0">{title}</h3>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {actions && actions.length > 0 ? (
        <div className="empty-state-actions">
          {actions.map((action, index) => {
            if (action.href) {
              return (
                <ButtonLink
                  key={`${action.label}-${index}`}
                  href={action.href}
                  variant={action.variant}
                  className={action.className}
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
                >
                  {action.label}
                </Button>
              );
            }

            return null;
          })}
        </div>
      ) : null}
    </div>
  );

  if (!wrapInCard) {
    return content;
  }

  return <Card className={cn("centered-card", cardClassName)}>{content}</Card>;
}
