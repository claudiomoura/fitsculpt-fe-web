import Link from "next/link";
import { WorkoutHeroCard } from "@/design-system";

type HeroWorkoutProps = {
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export function HeroWorkout({ title, subtitle, meta, badge, ctaLabel, ctaHref, secondaryCtaLabel, secondaryCtaHref }: HeroWorkoutProps) {
  return (
    <WorkoutHeroCard
      title={title}
      subtitle={subtitle}
      meta={meta}
      badge={badge}
      cta={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          {secondaryCtaLabel && secondaryCtaHref ? (
            <Link
              href={secondaryCtaHref}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-bg/35 px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-bg/10"
            >
              {secondaryCtaLabel}
            </Link>
          ) : null}
          <Link
            href={ctaHref}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-bg px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-bg/90"
          >
            {ctaLabel}
          </Link>
        </div>
      }
    />
  );
}
