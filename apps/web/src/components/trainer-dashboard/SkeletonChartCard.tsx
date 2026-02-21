import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

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
