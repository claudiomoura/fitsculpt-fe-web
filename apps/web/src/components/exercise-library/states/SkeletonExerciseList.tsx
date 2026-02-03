import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/classNames";

type SkeletonExerciseListProps = {
  count?: number;
  className?: string;
};

export function SkeletonExerciseList({ count = 6, className }: SkeletonExerciseListProps) {
  return (
    <div className={cn("list-grid", className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}
