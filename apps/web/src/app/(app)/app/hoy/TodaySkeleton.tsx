import { Skeleton } from "@/components/ui/Skeleton";

export function TodaySkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]" aria-busy="true" aria-live="polite" data-testid="today-wow-skeleton">
      <article className="order-3 rounded-3xl border p-5 lg:order-2" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }}>
        <Skeleton variant="line" className="w-24" />
        <Skeleton variant="line" className="mt-3 w-36" />
        <Skeleton variant="line" className="mt-5 w-20" />
        <Skeleton variant="line" className="mt-5 h-11 w-full" />
      </article>
      <div className="order-1 space-y-4">
        <article className="rounded-3xl border p-5 md:p-6" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }}>
          <Skeleton variant="line" className="w-28" />
          <Skeleton variant="line" className="mt-3 w-48" />
          <Skeleton variant="line" className="mt-3 w-40" />
          <Skeleton variant="line" className="mt-5 h-11 w-full" />
        </article>
        <article className="rounded-3xl border p-5" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }}>
          <Skeleton variant="line" className="w-24" />
          <Skeleton variant="line" className="mt-3 w-40" />
          <Skeleton variant="line" className="mt-3 w-24" />
          <Skeleton variant="line" className="mt-5 h-11 w-full" />
        </article>
      </div>
      <article className="order-4 rounded-3xl border p-5" style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }}>
        <Skeleton variant="line" className="w-24" />
        <Skeleton variant="line" className="mt-3 w-40" />
        <Skeleton variant="line" className="mt-3 w-20" />
        <Skeleton variant="line" className="mt-5 h-11 w-full" />
      </article>
    </section>
  );
}
