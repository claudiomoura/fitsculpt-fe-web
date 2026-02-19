import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type SkeletonClientListProps = {
  rows?: number;
  showHeader?: boolean;
  className?: string;
};

export function SkeletonClientList({ rows = 4, showHeader = true, className }: SkeletonClientListProps) {
  return (
    <Card className={className}>
      {showHeader ? (
        <CardHeader>
          <Skeleton variant="line" style={{ width: "35%" }} />
        </CardHeader>
      ) : null}
      <CardContent>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} style={{ display: "grid", gap: "0.5rem" }}>
              <Skeleton variant="line" style={{ width: "40%" }} />
              <Skeleton variant="line" style={{ width: "65%" }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
