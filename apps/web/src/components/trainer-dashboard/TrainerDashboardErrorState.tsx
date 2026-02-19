import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";

type TrainerDashboardErrorStateProps = {
  title: ReactNode;
  description?: ReactNode;
  retryLabel?: ReactNode;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
};

export function TrainerDashboardErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  action,
  className,
}: TrainerDashboardErrorStateProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{description ? <CardDescription>{description}</CardDescription> : null}</CardContent>
      {action || (retryLabel && onRetry) ? (
        <CardFooter>
          {action ?? (
            <Button variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </CardFooter>
      ) : null}
    </Card>
  );
}
