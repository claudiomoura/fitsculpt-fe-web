import { Skeleton } from "@/components/ui/Skeleton";

export function TodaySkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-live="polite" data-testid="today-wow-skeleton">
      {Array.from({ length: 4 }).map((_, index) => (
        <article
          key={index}
          className={`rounded-3xl border p-5 ${index === 1 ? "md:col-span-2 md:min-h-[270px]" : "min-h-[220px]"}`}
          style={{ background: "#0F1624", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <Skeleton variant="line" className="w-24" />
          <Skeleton variant="line" className="mt-3 w-40" />
          <Skeleton variant="line" className="mt-5 w-24" />
          <Skeleton variant="line" className="mt-3 w-full" />
          <Skeleton variant="line" className="mt-5 h-11 w-full" />
        </article>
      ))}
    </section>
  );
}
