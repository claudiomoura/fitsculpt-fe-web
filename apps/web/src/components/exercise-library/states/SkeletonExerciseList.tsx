import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/classNames";

type SkeletonExerciseListProps = {
  count?: number;
  className?: string;
};

export function SkeletonExerciseList({ count = 6, className }: SkeletonExerciseListProps) {
  return (
    <div className={cn("list-grid", className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="feature-card">
          <Skeleton className="skeleton-media" />
          <Skeleton variant="line" className="w-70" />
          <div className="badge-list">
            <Skeleton variant="line" className="w-30" />
            <Skeleton variant="line" className="w-25" />
          </div>
          <Skeleton variant="line" className="w-55" />
          <Skeleton variant="line" className="w-80" />
        </div>
      ))}
    </div>
  );
}
