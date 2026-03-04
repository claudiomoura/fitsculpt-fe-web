import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

type TodayCardProps = {
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  href: string;
  progressLabel: string;
};

export function TodayCard({ title, subtitle, body, ctaLabel, href, progressLabel }: TodayCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-subtle bg-[var(--bg-panel)] p-4">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-text-muted">{subtitle}</p>
      <h2 className="mt-2 text-base font-semibold text-text">{title}</h2>
      <p className="mt-2 text-sm text-text-muted">{body}</p>
      <p className="mt-3 text-xs font-medium text-text-muted">{progressLabel}</p>
      <ButtonLink as={Link} href={href} size="lg" className="mt-4 w-full">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
