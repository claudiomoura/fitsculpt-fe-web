"use client";

import { useEffect, useMemo } from "react";
import { Badge } from "@/design-system/components/Badge";
import { ButtonLink } from "@/design-system/components/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/design-system/components/Card";
import { useLanguage } from "@/context/LanguageProvider";
import { trackEvent } from "@/lib/analytics";

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
const PRICING_HERO_AB_TEST_ENABLED = true;
const PRICING_HERO_VARIANT_STORAGE_KEY = "fitsculpt_pricing_hero_variant";

type PricingHeroVariant = "control" | "focus";

function getPricingHeroVariant(): PricingHeroVariant {
  if (!PRICING_HERO_AB_TEST_ENABLED || typeof window === "undefined") return "control";

  const stored = window.localStorage.getItem(PRICING_HERO_VARIANT_STORAGE_KEY);
  if (stored === "control" || stored === "focus") return stored;

  const variant: PricingHeroVariant = Math.random() < 0.5 ? "control" : "focus";
  window.localStorage.setItem(PRICING_HERO_VARIANT_STORAGE_KEY, variant);
  return variant;
}

function RatingStars({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-1" aria-label={label}>
      {Array.from({ length: 5 }).map((_, index) => (
        <svg key={index} viewBox="0 0 20 20" className="h-4 w-4 fill-primary" aria-hidden="true">
          <path d="M10 1.7l2.5 5.06 5.58.81-4.04 3.94.95 5.57L10 14.43 5.01 17.08l.95-5.57L1.92 7.57l5.58-.81L10 1.7z" />
        </svg>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const { t } = useLanguage();
  const heroVariant = useMemo(getPricingHeroVariant, []);

  useEffect(() => {
    trackEvent("pricing_view", { origin: "pricing" });
    trackEvent("pricing_hero_variant_exposed", { origin: "pricing", variant: heroVariant, abTest: PRICING_HERO_AB_TEST_ENABLED ? "on" : "off" });
  }, [heroVariant]);

  const plans = useMemo(
    () =>
      PLAN_DATA.map((plan) => ({
        ...plan,
        title: t(`marketingPricing.plans.${plan.key}.title`),
        price: t(`marketingPricing.plans.${plan.key}.price`),
        tagline: t(`marketingPricing.plans.${plan.key}.tagline`),
        idealFor: t(`marketingPricing.plans.${plan.key}.idealFor`),
        cta: t(`marketingPricing.plans.${plan.key}.cta`),
        includesTitle: t("marketingPricing.comparison.includesTitle"),
        excludesTitle: t("marketingPricing.comparison.excludesTitle"),
        includes: [1, 2].map((featureIndex) => t(`marketingPricing.plans.${plan.key}.includes.${featureIndex}`)),
        excludes: [1, 2].map((featureIndex) => t(`marketingPricing.plans.${plan.key}.excludes.${featureIndex}`)),
        features: [1, 2, 3, 4].map((featureIndex) =>
          t(`marketingPricing.plans.${plan.key}.features.${featureIndex}`)
        ),
      })),
    [t]
  );

  return (
    <div className="pricing-page min-h-screen">
      <div className="pricing-container pb-20 pt-10">
        <section className="pricing-hero">
          <h1 className="pricing-hero__title">
            {heroVariant === "focus" ? t("marketingPricing.hero.variants.focus.title") : t("marketingPricing.title")}
          </h1>
          <p className="pricing-hero__sub">
            {heroVariant === "focus" ? t("marketingPricing.hero.variants.focus.subtitle") : t("marketingPricing.subtitle")}
          </p>
          <p className="mt-3 text-sm text-text-muted">{t("marketingPricing.compliance.heroExpectationNote")}</p>
          <ButtonLink
            href="#precios"
            variant="secondary"
            className="mt-5"
            onClick={() => {
              trackEvent("pricing_hero_cta_click", { origin: "pricing", variant: heroVariant, abTest: PRICING_HERO_AB_TEST_ENABLED ? "on" : "off", target: "planes" });
            }}
          >
            {t("marketingPricing.hero.cta")}
          </ButtonLink>
        </section>

        <section
          id="precios"
          className="pricing-plans pricing-plans--anchor mt-10 grid gap-4 lg:grid-cols-3 lg:items-stretch"
        >
          {plans.map((plan) => (
            <Card
              key={plan.key}
              className={[
                "pricing-card flex h-full flex-col",
                plan.tone === "highlight" ? "pricing-card--highlight" : "",
                plan.key === "pro" ? "pricing-card--pro" : "",
              ].join(" ")}
            >
              <CardHeader className="pricing-card__header">
                {plan.key === "pro" ? (
                  <Badge className="pricing-badge w-fit">{t("marketingPricing.plans.pro.badge")}</Badge>
                ) : null}

                <div className="pricing-card__top">
                  <CardTitle className="pricing-card__title">{plan.title}</CardTitle>
                  <div className="pricing-card__price">{plan.price}</div>
                </div>

                <CardDescription className="pricing-card__tagline">{plan.tagline}</CardDescription>
                <p className="pricing-card__ideal">{plan.idealFor}</p>
              </CardHeader>

              <CardContent className="pricing-card__content">
                <div className="pricing-card__comparison">
                  <p className="pricing-card__comparison-title">{plan.includesTitle}</p>
                  <ul className="pricing-card__comparison-list">
                    {plan.includes.map((item) => (
                      <li key={`${plan.key}-in-${item}`} className="pricing-card__comparison-item">+ {item}</li>
                    ))}
                  </ul>
                  <p className="pricing-card__comparison-title pricing-card__comparison-title--muted">{plan.excludesTitle}</p>
                  <ul className="pricing-card__comparison-list">
                    {plan.excludes.map((item) => (
                      <li key={`${plan.key}-out-${item}`} className="pricing-card__comparison-item pricing-card__comparison-item--muted">- {item}</li>
                    ))}
                  </ul>
                </div>
                <ul className="pricing-card__list">
                  {plan.features.map((feature) => (
                    <li key={feature} className="pricing-card__item">
                      <span aria-hidden="true" className="pricing-dot" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="mt-auto">
                <ButtonLink
                  href="/register"
                  variant={plan.tone === "highlight" ? "primary" : "secondary"}
                  className="w-full justify-center pricing-card__cta"
                  onClick={() => {
                    trackEvent("plan_cta_click", { origin: "pricing_page", target: "billing", planId: plan.key, planName: plan.title });
                    trackEvent("checkout_start_register_click", { origin: "pricing_page", target: "billing", planId: plan.key, planName: plan.title });
                    trackEvent("pricing_hero_variant_cta_click", { origin: "pricing_page", target: "billing", planId: plan.key, planName: plan.title, variant: heroVariant, abTest: PRICING_HERO_AB_TEST_ENABLED ? "on" : "off" });
                  }}
                >
                  {plan.cta}
                </ButtonLink>
              </CardFooter>
            </Card>
          ))}
        </section>

        <p className="mt-6 text-center text-sm text-text-muted">{t("marketingPricing.billingNote")}</p>
        <p className="mt-2 text-center text-xs text-text-muted">{t("marketingPricing.compliance.pricingDisclaimer")}</p>

        <section id="caracteristicas" className="mt-14 space-y-6 scroll-mt-28" aria-labelledby="pricing-features-title">
          <div className="space-y-2 text-center">
            <h2 id="pricing-features-title" className="text-2xl font-bold sm:text-3xl">
              {t("marketingPricing.features.title")}
            </h2>
            <p className="text-sm text-text-muted sm:text-base">{t("marketingPricing.features.subtitle")}</p>
          </div>

          <ul className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((index) => (
              <li key={index} className="rounded-2xl border border-border bg-surface p-5 text-sm text-text-muted">
                {t(`marketingPricing.features.items.${index}`)}
              </li>
            ))}
          </ul>
        </section>

        <section id="testimonios" className="mt-14 space-y-6 scroll-mt-28" aria-labelledby="testimonials-title">
          <div className="space-y-2 text-center">
            <h2 id="testimonials-title" className="text-2xl font-bold sm:text-3xl">
              {t("marketingPricing.testimonials.title")}
            </h2>
            <p className="text-sm text-text-muted sm:text-base">{t("marketingPricing.testimonials.subtitle")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIAL_KEYS.map((key) => (
                <Card key={key} className="pricing-tcard">
                  <CardHeader>
                    <RatingStars label={t("marketingPricing.testimonials.starsLabel")} />
                    <CardDescription className="text-sm leading-relaxed text-text-muted">
                      “{t(`marketingPricing.testimonials.items.${key}.quote`)}”
                    </CardDescription>
                    <div className="mt-3 space-y-1 text-xs text-text-muted">
                      <p><strong>{t("marketingPricing.testimonials.labels.objective")}:</strong> {t(`marketingPricing.testimonials.items.${key}.objective`)}</p>
                      <p><strong>{t("marketingPricing.testimonials.labels.timeline")}:</strong> {t(`marketingPricing.testimonials.items.${key}.timeline`)}</p>
                      <p><strong>{t("marketingPricing.testimonials.labels.result")}:</strong> {t(`marketingPricing.testimonials.items.${key}.result`)}</p>
                    </div>
                  </CardHeader>
                </Card>
              ))}
          </div>

          <p className="text-center text-xs text-text-muted">{t("marketingPricing.testimonials.disclaimer")}</p>
        </section>
      </div>
    </div>
  );
}
