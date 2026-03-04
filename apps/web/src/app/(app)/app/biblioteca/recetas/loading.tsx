import { SkeletonCard } from "@/components/ui/Skeleton";

export default function RecipeLibraryLoading() {
  return (
    <div className="page">
      <section className="card">
        <div className="list-grid" role="status" aria-live="polite" aria-label="Loading recipes">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      </section>
    </div>
  );
}
