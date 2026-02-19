import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";

type TrainerDashboardEmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function TrainerDashboardEmptyState({ title, description, action, className }: TrainerDashboardEmptyStateProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{description ? <CardDescription>{description}</CardDescription> : null}</CardContent>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}
