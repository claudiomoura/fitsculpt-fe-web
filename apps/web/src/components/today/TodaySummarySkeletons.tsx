import { Skeleton } from "@/components/ui/Skeleton";

export function TodayTrainingSkeleton() {
  return (
    <div className="stack-md">
      <Skeleton variant="line" style={{ width: "50%" }} />
      <Skeleton variant="line" style={{ width: "35%" }} />
      <Skeleton variant="line" style={{ width: "30%" }} />
    </div>
  );
}

export function TodayNutritionSkeleton() {
  return (
    <div className="stack-md">
      <div className="stack-sm">
        <Skeleton variant="line" style={{ width: "45%" }} />
        <Skeleton variant="line" style={{ width: "40%" }} />
      </div>
      <div className="stack-sm">
        <Skeleton variant="line" style={{ width: "70%" }} />
        <Skeleton variant="line" style={{ width: "60%" }} />
      </div>
    </div>
  );
}

export function TodayWeightSkeleton() {
  return (
    <div className="stack-md">
      <Skeleton variant="line" style={{ width: "40%" }} />
      <Skeleton variant="line" style={{ width: "28%" }} />
      <Skeleton variant="line" style={{ width: "22%" }} />
    </div>
  );
}

export function TodayEnergySkeleton() {
  return (
    <div className="stack-md">
      <Skeleton variant="line" style={{ width: "35%" }} />
      <Skeleton variant="line" style={{ width: "30%" }} />
      <Skeleton variant="line" style={{ width: "25%" }} />
    </div>
  );
}

export function TodayNotesSkeleton() {
  return (
    <div className="stack-md">
      <Skeleton variant="line" style={{ width: "45%" }} />
      <Skeleton variant="line" style={{ width: "60%" }} />
      <Skeleton variant="line" style={{ width: "40%" }} />
    </div>
  );
}
