import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonExerciseDetail() {
  return (
    <Card className="centered-card">
      <div className="stack-lg">
        <div className="page-header">
          <div className="page-header-body">
            <Skeleton variant="line" className="w-60" />
            <Skeleton variant="line" className="w-80" />
          </div>
          <div className="page-header-actions">
            <Skeleton variant="line" className="w-25" />
            <Skeleton variant="line" className="w-30" />
          </div>
        </div>
        <div className="badge-list">
          <Skeleton variant="line" className="w-40" />
          <Skeleton variant="line" className="w-45" />
          <Skeleton variant="line" className="w-45" />
        </div>
        <div className="info-grid mt-16">
          <Skeleton className="info-item" />
          <Skeleton className="info-item" />
          <Skeleton className="info-item" />
        </div>
        <div className="exercise-detail-grid">
          <Skeleton className="exercise-media" />
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
