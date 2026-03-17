import { Card, CardContent, CardHeader } from "@/design-system/components/Card";
import { Skeleton } from "@/design-system/components/Skeleton";

type SkeletonKpiGridProps = {
  items?: number;
  className?: string;
};

export function SkeletonKpiGrid({ items = 3, className }: SkeletonKpiGridProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: "0.75rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {Array.from({ length: items }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton variant="line" style={{ width: "45%" }} />
          </CardHeader>
          <CardContent>
            <Skeleton style={{ height: "36px", width: "38%" }} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
