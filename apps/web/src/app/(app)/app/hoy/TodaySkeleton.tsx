import { Skeleton } from "@/components/ui/Skeleton";

export function TodaySkeleton() {
  return (
    <section className="grid gap-3 md:grid-cols-3" aria-busy="true" aria-live="polite" data-testid="today-wow-skeleton">
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} className="rounded-xl border border-subtle bg-[var(--bg-panel)] p-4">
          <Skeleton variant="line" className="w-20" />
          <Skeleton variant="line" className="mt-2 w-32" />
          <Skeleton variant="line" className="mt-3 w-full" />
          <Skeleton variant="line" className="mt-1 w-3/4" />
          <Skeleton variant="line" className="mt-4 h-11 w-full" />
        </article>
      ))}
    </section>
  );
}
