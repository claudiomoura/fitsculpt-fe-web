import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type ChartCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: boolean;
  loadingContent?: ReactNode;
  emptyContent?: ReactNode;
  errorContent?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function ChartCard({
  title,
  subtitle,
  loading = false,
  empty = false,
  error = false,
  loadingContent,
  emptyContent,
  errorContent,
  children,
  className,
}: ChartCardProps) {
  let content = children;

  if (loading) {
    content = loadingContent;
  } else if (error) {
    content = errorContent;
  } else if (empty) {
    content = emptyContent;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{content ?? null}</CardContent>
    </Card>
  );
}
