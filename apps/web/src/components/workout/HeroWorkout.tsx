import Link from "next/link";
import { WorkoutHeroCard } from "@/design-system";

type HeroWorkoutProps = {
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
};

export function HeroWorkout({ title, subtitle, meta, badge, ctaLabel, ctaHref }: HeroWorkoutProps) {
  return (
    <WorkoutHeroCard
      title={title}
      subtitle={subtitle}
      meta={meta}
      badge={badge}
      cta={
        <Link
          href={ctaHref}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-bg px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-bg/90"
        >
          {ctaLabel}
        </Link>
      }
    />
  );
}
