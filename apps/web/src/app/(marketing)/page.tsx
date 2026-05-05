"use client";

import { useLanguage } from "@/context/LanguageProvider";
import { LandingHomePage, type LandingCopy } from "@/components/landing/LandingHomePage";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function isNativeShell() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (["fs_app", "fsApp", "nativeApp", "capacitor"].some((param) => {
    const value = params.get(param)?.toLowerCase();
    return value === "1" || value === "true" || value === "yes" || value === "on";
  })) {
    return true;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes("capacitor") || ua.includes("com.fitsculpt.beta") || (ua.includes("android") && ua.includes("; wv)"));
}

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
        logos: [
          t("landing.home.socialProof.metric1"),
          t("landing.home.socialProof.metric2"),
          t("landing.home.socialProof.metric3"),
          t("landing.home.socialProof.metric4"),
        ],
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
            idealFor: isEn ? "Ideal for: focused strength progress." : isPt ? "Ideal para: progresso focado em treino." : "Ideal para: progreso de fuerza enfocado.",
            includes: [
              isEn ? "AI workouts" : isPt ? "Treinos IA" : "Entrenamientos IA",
              isEn ? "Progress tracking" : isPt ? "Seguimento de progresso" : "Seguimiento de progreso",
            ],
            excludes: [
              isEn ? "AI nutrition" : isPt ? "Nutricao IA" : "Nutricion IA",
              isEn ? "24/7 AI coach" : isPt ? "Coach IA 24/7" : "Coach IA 24/7",
            ],
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
            idealFor: isEn ? "Ideal for: complete recomposition." : isPt ? "Ideal para: recomposicao completa." : "Ideal para: recomposicion completa.",
            includes: [
              "TrainingAI + NutriAI",
              isEn ? "24/7 AI coach" : isPt ? "Coach IA 24/7" : "Coach IA 24/7",
            ],
            excludes: [
              isEn ? "No core module exclusions" : isPt ? "Sem exclusoes principais" : "Sin exclusiones principales",
              isEn ? "No baseline usage limits" : isPt ? "Sem limites base" : "Sin limites base",
            ],
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
            idealFor: isEn ? "Ideal for: habit and nutrition adherence." : isPt ? "Ideal para: aderencia nutricional." : "Ideal para: adherencia nutricional.",
            includes: [
              isEn ? "AI nutrition plans" : isPt ? "Planos nutricionais IA" : "Planes de nutricion IA",
              isEn ? "Macros and recipes" : isPt ? "Macros e receitas" : "Macros y recetas",
            ],
            excludes: [
              isEn ? "AI workouts" : isPt ? "Treinos IA" : "Entrenamientos IA",
              isEn ? "24/7 AI coach" : isPt ? "Coach IA 24/7" : "Coach IA 24/7",
            ],
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
            idealFor: isEn ? "Ideal for: trying the app before upgrading." : isPt ? "Ideal para: experimentar antes de evoluir." : "Ideal para: probar antes de mejorar.",
            includes: [
              isEn ? "Free access" : isPt ? "Acesso gratuito" : "Acceso gratuito",
              isEn ? "Basic onboarding" : isPt ? "Onboarding base" : "Onboarding base",
            ],
            excludes: [
              isEn ? "Premium modules" : isPt ? "Modulos premium" : "Modulos premium",
              isEn ? "Advanced personalization" : isPt ? "Personalizacao avancada" : "Personalizacion avanzada",
            ],
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
            role: `${t("landing.home.testimonials.objectiveLabel")}: ${t("landing.home.testimonials.objective1")} · ${t("landing.home.testimonials.timelineLabel")}: ${t("landing.home.testimonials.timeline1")} · ${t("landing.home.testimonials.resultLabel")}: ${t("landing.home.testimonials.result1")}`,
            image: "/branding/guys.png",
          },
          {
            quote: t("landing.home.testimonials.quote2"),
            author: t("landing.home.testimonials.author2"),
            role: `${t("landing.home.testimonials.objectiveLabel")}: ${t("landing.home.testimonials.objective2")} · ${t("landing.home.testimonials.timelineLabel")}: ${t("landing.home.testimonials.timeline2")} · ${t("landing.home.testimonials.resultLabel")}: ${t("landing.home.testimonials.result2")}`,
            image: "/branding/girl_front.png",
          },
          {
            quote: t("landing.home.testimonials.quote3"),
            author: t("landing.home.testimonials.author3"),
            role: `${t("landing.home.testimonials.objectiveLabel")}: ${t("landing.home.testimonials.objective3")} · ${t("landing.home.testimonials.timelineLabel")}: ${t("landing.home.testimonials.timeline3")} · ${t("landing.home.testimonials.resultLabel")}: ${t("landing.home.testimonials.result3")}`,
            image: "/branding/girl_back.png",
          },
        ],
      },
      finalCta: {
        title: t("landing.home.finalCta.title"),
        subtitle: t("landing.home.finalCta.subtitle"),
        placeholder: t("landing.home.finalCta.placeholder"),
        button: t("landing.home.finalCta.button"),
        emailAriaLabel: t("landing.home.finalCta.emailAriaLabel"),
      },
    };
  }, [t, locale]);
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = useHomeCopy();

  useEffect(() => {
    if (!isNativeShell()) return;

    const params = new URLSearchParams(searchParams?.toString());
    params.set("nativeApp", "1");
    router.replace(`/login?${params.toString()}`);
  }, [router, searchParams]);

  return <LandingHomePage copy={copy} />;
}
