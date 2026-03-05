import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";

type TodayCardTone = "hero" | "default";

type TodayCardProps = {
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  progressLabel: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  onCtaClick?: () => void;
  tone?: TodayCardTone;
  orderClassName?: string;
  metric?: string;
  helper?: string;
};

export function TodayCard({
  title,
  subtitle,
  body,
  ctaLabel,
  progressLabel,
  href,
  onClick,
  loading = false,
  onCtaClick,
  tone = "default",
  orderClassName,
  metric,
  helper,
}: TodayCardProps) {
  const handleButtonClick = () => {
    onCtaClick?.();
    onClick?.();
  };

  const isHero = tone === "hero";

  return (
    <article
      className={`flex h-full min-h-[220px] flex-col rounded-3xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${
        isHero ? "md:min-h-[270px]" : ""
      } ${orderClassName ?? ""}`}
      style={{
        background: "#0F1624",
        borderColor: "rgba(255,255,255,0.06)",
      }}
      data-testid="today-action-card"
    >
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-300/90">{subtitle}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-100">{title}</h2>
      {metric ? <p className="mt-3 text-3xl font-semibold leading-none text-emerald-300">{metric}</p> : null}
      <p className="mt-3 text-sm text-slate-300">{body}</p>
      {helper ? <p className="mt-2 text-xs text-slate-400">{helper}</p> : null}
      <p className="mt-4 text-xs font-medium text-slate-400">{progressLabel}</p>
      {href ? (
        <ButtonLink
          as={Link}
          href={href}
          size="lg"
          className="mt-auto w-full"
          data-testid="today-action-button"
          onClick={onCtaClick}
          style={
            isHero
              ? {
                  background: "#22D3EE",
                  borderColor: "rgba(34,211,238,0.68)",
                  color: "#06202a",
                  boxShadow: "0 10px 26px rgba(34,211,238,0.35)",
                }
              : undefined
          }
        >
          {ctaLabel}
        </ButtonLink>
      ) : (
        <Button
          className="mt-auto w-full"
          size="lg"
          onClick={handleButtonClick}
          loading={loading}
          data-testid="today-action-button"
          style={
            isHero
              ? {
                  background: "#22D3EE",
                  borderColor: "rgba(34,211,238,0.68)",
                  color: "#06202a",
                  boxShadow: "0 10px 26px rgba(34,211,238,0.35)",
                }
              : undefined
          }
        >
          {ctaLabel}
        </Button>
      )}
    </article>
  );
}
