import Link from "next/link";
import { ButtonLink } from "@/design-system/components/Button";

type TodayEmptyStateProps = {
  description: string;
  ctaLabel: string;
  href: string;
};

export function TodayEmptyState({ description, ctaLabel, href }: TodayEmptyStateProps) {
  return (
    <section
      className="card premium-surface-card today-inline-state today-inline-state--empty"
      data-testid="today-wow-empty"
    >
      <p className="m-0 text-sm text-muted">{description}</p>
      <ButtonLink as={Link} href={href} size="lg" className="mt-4 w-full sm:w-auto">
        {ctaLabel}
      </ButtonLink>
    </section>
  );
}
