"use client";

import { useLanguage } from "@/context/LanguageProvider";
import { LandingHomePage, type LandingCopy } from "@/components/landing/LandingHomePage";
import { useMemo } from "react";

function useHomeCopy(): LandingCopy {
  const { t, locale } = useLanguage();

  return useMemo(() => {
    const isEn = locale === "en";
    const isPt = locale === "pt";

    return {
      hero: {
        title: t(isEn ? "landing.home.hero.title" : isPt ? "landing.home.hero.titlePt" : "landing.home.hero.title"),
        subtitle: t(isEn ? "landing.home.hero.subtitle" : isPt ? "landing.home.hero.subtitlePt" : "landing.home.hero.subtitle"),
        primaryCta: t("landing.home.hero.primaryCta"),
        secondaryCta: t("landing.home.hero.secondaryCta"),
        heroImage: "/branding/girl_front.png",
      },
      socialProof: {
        label: t("landing.home.socialProof.label"),
        logos: ["FORBES", "WIRED", "TECHCRUNCH", "MEN'S HEALTH"],
      },
      features: {
        items: [
          {
            title: t("landing.home.features.ai.title"),
            description: t("landing.home.features.ai.description"),
            iconAlt: "AI",
            iconEmoji: "🤖",
          },
          {
            title: t("landing.home.features.nutrition.title"),
            description: t("landing.home.features.nutrition.description"),
            iconAlt: "Nutrition",
            iconEmoji: "🍎",
          },
          {
            title: t("landing.home.features.tracking.title"),
            description: t("landing.home.features.tracking.description"),
            iconAlt: "Analytics",
            iconEmoji: "📊",
          },
          {
            title: t("landing.home.features.community.title"),
            description: t("landing.home.features.community.description"),
            iconAlt: "Community",
            iconEmoji: "👥",
          },
        ],
      },
      howItWorks: {
        steps: [
          {
            title: t("landing.home.howItWorks.step1.title"),
            description: t("landing.home.howItWorks.step1.description"),
            image: "/branding/girl_front.png",
          },
          {
            title: t("landing.home.howItWorks.step2.title"),
            description: t("landing.home.howItWorks.step2.description"),
            image: "/branding/girl_back.png",
          },
          {
            title: t("landing.home.howItWorks.step3.title"),
            description: t("landing.home.howItWorks.step3.description"),
            image: "/branding/girl_front.png",
          },
        ],
      },
      pricing: {
        title: t("landing.home.pricing.title"),
        subtitle: t("landing.home.pricing.subtitle"),
        tiers: [
          {
            name: t("landing.home.pricing.trainingAI.name"),
            price: "5,99€",
            period: t("landing.home.pricing.period"),
            description: t("landing.home.pricing.trainingAI.description"),
            features: [
              t("landing.home.pricing.trainingAI.feature1"),
              t("landing.home.pricing.trainingAI.feature2"),
              t("landing.home.pricing.trainingAI.feature3"),
              t("landing.home.pricing.trainingAI.feature4"),
            ],
            cta: t("landing.home.pricing.trainingAI.cta"),
          },
          {
            name: t("landing.home.pricing.pro.name"),
            price: "9,99€",
            period: t("landing.home.pricing.period"),
            description: t("landing.home.pricing.pro.description"),
            features: [
              t("landing.home.pricing.pro.feature1"),
              t("landing.home.pricing.pro.feature2"),
              t("landing.home.pricing.pro.feature3"),
              t("landing.home.pricing.pro.feature4"),
            ],
            cta: t("landing.home.pricing.pro.cta"),
            popular: true,
          },
          {
            name: t("landing.home.pricing.nutriAI.name"),
            price: "5,99€",
            period: t("landing.home.pricing.period"),
            description: t("landing.home.pricing.nutriAI.description"),
            features: [
              t("landing.home.pricing.nutriAI.feature1"),
              t("landing.home.pricing.nutriAI.feature2"),
              t("landing.home.pricing.nutriAI.feature3"),
              t("landing.home.pricing.nutriAI.feature4"),
            ],
            cta: t("landing.home.pricing.nutriAI.cta"),
          },
          {
            name: t("landing.home.pricing.free.name"),
            price: "0€",
            period: t("landing.home.pricing.period"),
            description: t("landing.home.pricing.free.description"),
            features: [
              t("landing.home.pricing.free.feature1"),
              t("landing.home.pricing.free.feature2"),
              t("landing.home.pricing.free.feature3"),
              t("landing.home.pricing.free.feature4"),
            ],
            cta: t("landing.home.pricing.free.cta"),
          },
        ],
      },
      testimonials: {
        items: [
          {
            quote: t("landing.home.testimonials.quote1"),
            author: t("landing.home.testimonials.author1"),
            role: t("landing.home.testimonials.role1"),
            image: "/branding/guys.png",
          },
          {
            quote: t("landing.home.testimonials.quote2"),
            author: t("landing.home.testimonials.author2"),
            role: t("landing.home.testimonials.role2"),
            image: "/branding/girl_front.png",
          },
          {
            quote: t("landing.home.testimonials.quote3"),
            author: t("landing.home.testimonials.author3"),
            role: t("landing.home.testimonials.role3"),
            image: "/branding/girl_back.png",
          },
        ],
      },
      finalCta: {
        title: t("landing.home.finalCta.title"),
        subtitle: t("landing.home.finalCta.subtitle"),
        placeholder: t("landing.home.finalCta.placeholder"),
        button: t("landing.home.finalCta.button"),
      },
    };
  }, [t, locale]);
}

export default function HomePage() {
  const copy = useHomeCopy();
  return <LandingHomePage copy={copy} />;
}
