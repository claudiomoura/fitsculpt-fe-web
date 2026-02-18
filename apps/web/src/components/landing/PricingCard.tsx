import Link from "next/link";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

type PricingCardProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  summary: string;
  details: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
};

export function PricingCard({
  name,
  summary,
  details,
  features,
  ctaLabel,
  ctaHref,
  highlighted = false,
  className,
  ...props
}: PricingCardProps) {
  return (
    <article className={cn("landing-pricing-card", highlighted && "landing-pricing-card--highlighted", className)} {...props}>
      <div className="landing-pricing-card__header">
        <h3>{name}</h3>
        <p>{summary}</p>
      </div>
      <p className="landing-pricing-card__details">{details}</p>
      <ul className="landing-pricing-card__feature-list">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <Link href={ctaHref} className={cn("landing-button", highlighted ? "landing-button--primary" : "landing-button--secondary", "landing-button--md")}>
        {ctaLabel}
      </Link>
    </article>
  );
}
