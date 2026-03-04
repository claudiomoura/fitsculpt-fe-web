import { Skeleton } from "@/components/ui/Skeleton";

export default function RecipeDetailLoading() {
  return (
    <div className="page">
      <section className="card centered-card" role="status" aria-live="polite" aria-label="Loading recipe detail">
        <Skeleton variant="line" className="w-60" />
        <Skeleton variant="line" className="w-45" />
        <Skeleton className="recipe-detail-media" />
        <Skeleton variant="line" className="w-80" />
        <Skeleton variant="line" className="w-70" />
        <Skeleton variant="line" className="w-55" />
      </section>
    </div>
  );
}
