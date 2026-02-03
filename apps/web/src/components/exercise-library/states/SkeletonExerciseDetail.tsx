import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonExerciseDetail() {
  return (
    <Card className="centered-card">
      <div className="stack-lg">
        <div className="stack-sm">
          <Skeleton variant="line" className="w-60" />
          <Skeleton variant="line" className="w-80" />
        </div>
        <div className="badge-list">
          <Skeleton variant="line" className="w-40" />
          <Skeleton variant="line" className="w-45" />
          <Skeleton variant="line" className="w-45" />
        </div>
        <div className="exercise-detail-grid">
          <Skeleton className="exercise-media" />
          <Skeleton className="feature-card" />
        </div>
        <div className="stack-sm">
          <Skeleton variant="line" className="w-55" />
          <Skeleton variant="line" className="w-70" />
          <Skeleton variant="line" className="w-45" />
        </div>
      </div>
    </Card>
  );
}
