import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type KpiCardProps = {
  title: ReactNode;
  value: ReactNode;
  definition?: ReactNode;
  loading?: boolean;
  className?: string;
  valueAriaLabel?: string;
};

export function KpiCard({ title, value, definition, loading = false, className, valueAriaLabel }: KpiCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {loading ? <Skeleton variant="line" style={{ width: "50%" }} /> : <CardDescription>{definition ?? null}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton style={{ height: "40px", width: "40%" }} />
        ) : (
          <p style={{ margin: 0, fontSize: "1.75rem", lineHeight: 1.2, fontWeight: 700 }} aria-label={valueAriaLabel}>
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
