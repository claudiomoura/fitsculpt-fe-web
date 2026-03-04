import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";

type TodayCardProps = {
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  progressLabel: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
};

export function TodayCard({ title, subtitle, body, ctaLabel, progressLabel, href, onClick, loading = false }: TodayCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-subtle bg-[var(--bg-panel)] p-4" data-testid="today-action-card">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-text-muted">{subtitle}</p>
      <h2 className="mt-2 text-base font-semibold text-text">{title}</h2>
      <p className="mt-2 text-sm text-text-muted">{body}</p>
      <p className="mt-3 text-xs font-medium text-text-muted">{progressLabel}</p>
      {href ? (
        <ButtonLink as={Link} href={href} size="lg" className="mt-4 w-full" data-testid="today-action-button">
          {ctaLabel}
        </ButtonLink>
      ) : (
        <Button className="mt-4 w-full" size="lg" onClick={onClick} loading={loading} data-testid="today-action-button">
          {ctaLabel}
        </Button>
      )}
    </article>
  );
}
