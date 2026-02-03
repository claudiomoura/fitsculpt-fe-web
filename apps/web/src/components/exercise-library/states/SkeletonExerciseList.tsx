import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/classNames";

type SkeletonExerciseListProps = {
  count?: number;
  showAction?: boolean;
  className?: string;
};

export function SkeletonExerciseList({ count = 6, showAction = true, className }: SkeletonExerciseListProps) {
  return (
    <div className={cn("list-grid", className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="feature-card library-card-skeleton">
          {showAction ? <Skeleton className="skeleton-favorite" /> : null}
          <Skeleton className="skeleton-media" />
          <Skeleton variant="line" className="w-70" />
          <div className="badge-list">
            <Skeleton variant="line" className="w-40" />
            <Skeleton variant="line" className="w-45" />
          </div>
          <Skeleton variant="line" className="w-55" />
          <Skeleton variant="line" className="w-80" />
        </div>
      ))}
    </div>
  );
}
