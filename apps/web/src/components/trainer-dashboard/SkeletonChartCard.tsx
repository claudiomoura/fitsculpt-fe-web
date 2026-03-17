import { Card, CardContent, CardHeader } from "@/design-system/components/Card";
import { Skeleton } from "@/design-system/components/Skeleton";

type SkeletonChartCardProps = {
  className?: string;
};

export function SkeletonChartCard({ className }: SkeletonChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton variant="line" style={{ width: "30%" }} />
        <Skeleton variant="line" style={{ width: "50%" }} />
      </CardHeader>
      <CardContent>
        <Skeleton style={{ minHeight: "220px", width: "100%" }} />
      </CardContent>
    </Card>
  );
}
