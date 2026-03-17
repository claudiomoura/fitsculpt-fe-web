import { Card, CardContent, CardHeader } from "@/design-system/components/Card";
import { Skeleton } from "@/design-system/components/Skeleton";

type GymListSkeletonProps = {
  count?: number;
};

export function GymListSkeleton({ count = 3 }: GymListSkeletonProps) {
  return (
    <div className="form-stack" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={`gym-skeleton-${index}`}>
          <CardHeader>
            <Skeleton variant="line" style={{ width: "55%" }} />
          </CardHeader>
          <CardContent className="form-stack">
            <Skeleton variant="line" style={{ width: "35%" }} />
            <Skeleton variant="line" style={{ width: "50%" }} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
