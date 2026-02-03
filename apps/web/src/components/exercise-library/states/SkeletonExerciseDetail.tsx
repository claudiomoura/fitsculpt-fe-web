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
            <Skeleton variant="line" className="w-40" />
            <Skeleton variant="line" className="w-45" />
          </div>
        </div>
        <div className="badge-list">
          <Skeleton variant="line" className="w-40" />
          <Skeleton variant="line" className="w-45" />
          <Skeleton variant="line" className="w-45" />
        </div>
        <div>
          <Skeleton variant="line" className="w-40" />
        </div>
        <div className="info-grid mt-16">
          <Skeleton className="info-item" />
          <Skeleton className="info-item" />
          <Skeleton className="info-item" />
        </div>
        <div className="exercise-detail-grid">
          <div className="feature-card exercise-media">
            <div className="exercise-media-header">
              <Skeleton variant="line" className="w-40" />
              <Skeleton variant="line" className="w-45" />
            </div>
            <div className="exercise-media-preview">
              <Skeleton className="exercise-media-skeleton" />
            </div>
          </div>
        </div>
        <div className="tab-list mt-20">
          <Skeleton variant="line" className="w-40" />
          <Skeleton variant="line" className="w-45" />
        </div>
        <div className="tab-panel">
          <div className="feature-card">
            <Skeleton variant="line" className="w-45" />
            <Skeleton variant="line" className="w-80" />
            <Skeleton variant="line" className="w-70" />
          </div>
          <div className="feature-card">
            <Skeleton variant="line" className="w-55" />
            <Skeleton variant="line" className="w-80" />
            <Skeleton variant="line" className="w-60" />
          </div>
        </div>
      </div>
    </Card>
  );
}
