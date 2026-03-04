import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

type TodayEmptyStateProps = {
  description: string;
  ctaLabel: string;
  href: string;
};

export function TodayEmptyState({ description, ctaLabel, href }: TodayEmptyStateProps) {
  return (
    <section className="rounded-xl border border-subtle bg-[var(--bg-panel)] p-4" data-testid="today-wow-empty">
      <p className="m-0 text-sm text-text-muted">{description}</p>
      <ButtonLink as={Link} href={href} size="lg" className="mt-3 w-full sm:w-auto">
        {ctaLabel}
      </ButtonLink>
    </section>
  );
}
