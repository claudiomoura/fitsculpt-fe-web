"use client";

import Link from "next/link";
import { useMemo } from "react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { useLanguage } from "@/context/LanguageProvider";

type PlanTone = "standard" | "highlight";

type PlanData = {
  key: "strength" | "pro" | "nutrition";
  tone: PlanTone;
};

const PLAN_DATA: PlanData[] = [
  { key: "strength", tone: "standard" },
  { key: "pro", tone: "highlight" },
  { key: "nutrition", tone: "standard" },
];

const TESTIMONIAL_KEYS = ["one", "two", "three"] as const;

function RatingStars({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-1" aria-label={label}>
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          className="h-4 w-4 fill-primary"
          aria-hidden="true"
        >
          <path d="M10 1.7l2.5 5.06 5.58.81-4.04 3.94.95 5.57L10 14.43 5.01 17.08l.95-5.57L1.92 7.57l5.58-.81L10 1.7z" />
        </svg>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const { t } = useLanguage();

  const plans = useMemo(
    () =>
      PLAN_DATA.map((plan) => ({
        ...plan,
        title: t(`marketingPricing.plans.${plan.key}.title`),
        price: t(`marketingPricing.plans.${plan.key}.price`),
        tagline: t(`marketingPricing.plans.${plan.key}.tagline`),
        cta: t(`marketingPricing.plans.${plan.key}.cta`),
        features: [1, 2, 3, 4].map((featureIndex) =>
          t(`marketingPricing.plans.${plan.key}.features.${featureIndex}`)
        ),
      })),
    [t]
  );

  return (
    <div className="min-h-screen bg-bg text-text">
      <MarketingHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="space-y-4 text-center">
          <h1 className="text-balance text-3xl font-bold leading-tight sm:text-5xl">
            {t("marketingPricing.hero.title")}
          </h1>
          <p className="text-balance text-base text-text-muted sm:text-lg">
            {t("marketingPricing.hero.subtitle")}
          </p>
          <p className="mx-auto max-w-3xl text-sm text-text-muted sm:text-base">
            {t("marketingPricing.hero.supporting")}
          </p>
        </section>

        <section id="plans" className="grid gap-5 scroll-mt-24 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <article
              key={plan.key}
              className={`flex h-full flex-col rounded-2xl border bg-surface p-6 ${
                plan.tone === "highlight"
                  ? "scale-100 border-primary shadow-[0_0_0_1px_rgba(0,245,195,0.35),0_16px_40px_rgba(0,245,195,0.12)] lg:scale-[1.03]"
                  : "border-border"
              }`}
            >
              {plan.key === "pro" ? (
                <span className="mb-4 inline-flex w-fit rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {t("marketingPricing.plans.pro.badge")}
                </span>
              ) : null}
              <h2 className="text-2xl font-semibold">{plan.title}</h2>
              <p className="mt-2 text-sm text-text-muted">{plan.tagline}</p>
              <p className="mt-6 text-3xl font-bold text-text">{plan.price}</p>
              <ul className="mt-6 space-y-3 text-sm text-text-muted">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-[14px] px-4 text-sm font-semibold transition ${
                  plan.tone === "highlight"
                    ? "bg-primary text-bg hover:opacity-90"
                    : "border border-secondary text-text hover:border-primary hover:text-primary"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </section>

        <p className="text-center text-sm text-text-muted">{t("marketingPricing.billingNote")}</p>

        <section id="testimonials" className="space-y-6 scroll-mt-24" aria-labelledby="testimonials-title">
          <div className="space-y-2 text-center">
            <h2 id="testimonials-title" className="text-2xl font-bold sm:text-3xl">
              {t("marketingPricing.testimonials.title")}
            </h2>
            <p className="text-sm text-text-muted sm:text-base">
              {t("marketingPricing.testimonials.subtitle")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIAL_KEYS.map((key) => (
              <article key={key} className="rounded-2xl border border-border bg-surface p-5">
                <RatingStars label={t("marketingPricing.testimonials.starsLabel")} />
                <p className="text-sm leading-relaxed text-text-muted">
                  “{t(`marketingPricing.testimonials.items.${key}.quote`)}”
                </p>
              </article>
            ))}
          </div>
          <p className="text-center text-xs text-text-muted">
            {t("marketingPricing.testimonials.disclaimer")}
          </p>
        </section>
      </main>
    </div>
  );
}
