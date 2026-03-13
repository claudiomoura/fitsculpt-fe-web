import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

type TodayEmptyStateProps = {
  description: string;
  ctaLabel: string;
  href: string;
};

export function TodayEmptyState({ description, ctaLabel, href }: TodayEmptyStateProps) {
  return (
    <section
      className="rounded-3xl border p-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      data-testid="today-wow-empty"
    >
      <p className="m-0 text-sm text-muted">{description}</p>
      <ButtonLink as={Link} href={href} size="lg" className="mt-4 w-full sm:w-auto">
        {ctaLabel}
      </ButtonLink>
    </section>
  );
}
