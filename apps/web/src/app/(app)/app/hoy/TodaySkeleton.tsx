import { Skeleton } from "@/design-system/components/Skeleton";

export function TodaySkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite" data-testid="today-wow-skeleton">
      <article className="surface-loading-card p-5 md:p-6">
        <Skeleton variant="line" className="w-28" />
        <Skeleton variant="line" className="mt-3 w-48" />
        <Skeleton variant="line" className="mt-3 w-40" />
        <Skeleton variant="line" className="mt-5 h-11 w-full" />
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="surface-loading-card p-5">
          <Skeleton variant="line" className="w-24" />
          <Skeleton variant="line" className="mt-3 w-40" />
          <Skeleton variant="line" className="mt-3 w-24" />
          <Skeleton variant="line" className="mt-5 h-11 w-full" />
        </article>

        <article className="surface-loading-card p-5">
        <Skeleton variant="line" className="w-24" />
        <Skeleton variant="line" className="mt-3 w-40" />
        <Skeleton variant="line" className="mt-3 w-20" />
        <Skeleton variant="line" className="mt-5 h-11 w-full" />
        </article>
      </div>
    </section>
  );
}
