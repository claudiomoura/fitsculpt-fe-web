"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export type LandingFeature = {
  title: string;
  description: string;
  iconEmoji: string;
  iconAlt: string;
  imageSrc?: string;
};

export type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  idealFor: string;
  includes: string[];
  excludes: string[];
  features: string[];
  cta: string;
  popular?: boolean;
};

export type LandingCopy = {
  hero: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    heroImage: string;
  };
  socialProof: {
    label: string;
    logos: string[];
  };
  features: {
    items: LandingFeature[];
  };
  howItWorks: {
    steps: { title: string; description: string; image: string }[];
  };
  pricing: {
    tiers: PricingTier[];
    title: string;
    subtitle: string;
  };
  testimonials: {
    items: { quote: string; author: string; role: string; image: string }[];
  };
  finalCta: {
    title: string;
    subtitle: string;
    placeholder: string;
    button: string;
    emailAriaLabel: string;
  };
};

const defaultCopy: LandingCopy = {
  hero: {
    title: "Tu Entrenador IA",
    subtitle: "Transforma tu cuerpo con planes de entrenamiento y nutrición personalizados generados por inteligencia artificial.",
    primaryCta: "Empezar Gratis",
    secondaryCta: "Ver Demo",
    heroImage: "/branding/girl_front.png",
  },
  socialProof: {
    label: "Señales de confianza en revisión: publica métricas verificadas antes del lanzamiento.",
    logos: [
      "Usuarios activos (placeholder): --",
      "Check-ins semanales (placeholder): --",
      "Retención 30 días (placeholder): --",
      "Reseñas verificadas (placeholder): --",
    ],
  },
  features: {
    items: [
      {
        title: "IA Personalizada",
        description: "Algoritmos que adaptan tu plan a tu progreso real y preferencias.",
        iconEmoji: "🧠",
        iconAlt: "AI",
      },
      {
        title: "Nutrición Inteligente",
        description: "Planes de comida personalizados basados en tus objetivos y gustos.",
        iconEmoji: "🍎",
        iconAlt: "Nutrition",
      },
      {
        title: "Seguimiento Real",
        description: "Métricas detalladas y analytics para entender tu evolución.",
        iconEmoji: "📊",
        iconAlt: "Analytics",
      },
      {
        title: "Comunidad Activa",
        description: "Retos mensuales, leaderboards y soporte de otros atletas.",
        iconEmoji: "👥",
        iconAlt: "Community",
      },
    ],
  },
  howItWorks: {
    steps: [
      {
        title: "Crea tu perfil",
        description: "Cuéntanos sobre tus objetivos, nivel de experiencia y preferencias alimentarias.",
        image: "/branding/girl_front.png",
      },
      {
        title: "Recibe tu plan",
        description: "La IA genera rutinas de entrenamiento y nutrición 100% personalizadas para ti.",
        image: "/branding/girl_back.png",
      },
      {
        title: "Entrena y evoluciona",
        description: "Seguimiento en tiempo real con ajustes automáticos según tu progreso.",
        image: "/branding/girl_front.png",
      },
    ],
  },
  pricing: {
    title: "Elige tu plan",
    subtitle: "Comienza gratis o level up cuando quieras",
    tiers: [
      {
        name: "TrainingAI",
        price: "5,99€",
        period: "/mes",
        description: "Solo entrenamiento con IA",
        idealFor: "Ideal para: priorizar fuerza y rutina semanal",
        includes: ["Entrenamientos IA ilimitados", "Seguimiento de progreso"],
        excludes: ["Nutricion IA", "Coach IA 24/7"],
        features: [
          "Planes de entrenamiento ilimitados IA",
          "Seguimiento avanzado",
          "Estadísticas detalladas",
          "Sin anuncios",
        ],
        cta: "Empezar Prueba",
      },
      {
        name: "Pro",
        price: "9,99€",
        period: "/mes",
        description: "Todo incluido: Training + Nutri",
        idealFor: "Ideal para: recomposicion completa con entrenamiento y nutricion",
        includes: ["TrainingAI + NutriAI", "Coach IA 24/7"],
        excludes: [],
        features: [
          "TrainingAI + NutriAI",
          "Coach IA 24/7",
          "Análisis completos",
          "Soporte prioritario",
        ],
        cta: "Elegir Pro",
        popular: true,
      },
      {
        name: "NutriAI",
        price: "5,99€",
        period: "/mes",
        description: "Solo nutrición con IA",
        idealFor: "Ideal para: mejorar habitos y composicion desde la alimentacion",
        includes: ["Planes de nutricion IA", "Macros y recetas"],
        excludes: ["Entrenamientos IA", "Coach IA 24/7"],
        features: [
          "Planes de nutrición IA",
          "Recetas personalizadas",
          "Seguimiento de macros",
          "Sin anuncios",
        ],
        cta: "Empezar Prueba",
      },
    ],
  },
  testimonials: {
    items: [
      {
        quote: "FitSculpt cambió completamente mi forma de entrenar. En 3 meses logré resultados que no había conseguido en 1 año.",
        author: "Carlos M.",
        role: "Usuario Pro",
        image: "/branding/guys.png",
      },
    ],
  },
  finalCta: {
    title: "¿Listo para transformar tu cuerpo?",
    subtitle: "Únete hoy y obtén tu primer mes gratis",
    placeholder: "tu@email.com",
    button: "Empezar",
    emailAriaLabel: "Introduce tu correo para crear tu cuenta",
  },
};

// Simple emoji icon component with brand styling
function FeatureIcon({ emoji }: { emoji: string }) {
  return (
    <div className="lp-feature-icon-wrapper">
      <span className="lp-feature-icon-emoji">{emoji}</span>
    </div>
  );
}

export function LandingHomePage({ copy = defaultCopy }: { copy?: LandingCopy }) {
  useEffect(() => {
    trackEvent("landing_view", { origin: "landing" });
  }, []);

  const handleHeroPrimaryClick = () => {
    trackEvent("hero_cta_click", { origin: "landing_hero", target: "billing" });
    trackEvent("checkout_start_register_click", { origin: "landing_hero", target: "billing" });
  };

  const handlePlanClick = (tier: PricingTier) => {
    trackEvent("plan_cta_click", {
      origin: "landing_pricing",
      target: "billing",
      planId: tier.name.toLowerCase(),
      planName: tier.name,
    });
    trackEvent("checkout_start_register_click", {
      origin: "landing_pricing",
      target: "billing",
      planId: tier.name.toLowerCase(),
      planName: tier.name,
    });
  };

  return (
    <div className="lp-v2">
      {/* Hero Section */}
      <section className="lp-hero-v2" aria-labelledby="landing-hero-title">
        <div className="lp-hero-v2__inner">
          <div className="lp-hero-v2__content">
            <h1 id="landing-hero-title" className="lp-hero-v2__title">{copy.hero.title}</h1>
            <p className="lp-hero-v2__subtitle">{copy.hero.subtitle}</p>
            <div className="lp-hero-v2__ctas">
              <Link href="/register" className="lp-btn-v2 lp-btn-v2--primary" aria-label={copy.hero.primaryCta} onClick={handleHeroPrimaryClick}>
                {copy.hero.primaryCta}
              </Link>
              <Link href="/pricing#planes" className="lp-btn-v2 lp-btn-v2--secondary" aria-label={copy.hero.secondaryCta}>
                {copy.hero.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="lp-hero-v2__image">
            <Image
              src={copy.hero.heroImage}
              alt="FitSculpt - Transforma tu cuerpo"
              width={600}
              height={800}
              priority
              className="lp-hero-v2__img"
            />
            <div className="lp-hero-v2__image-glow" />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="lp-social-v2">
        <p className="lp-social-v2__label">{copy.socialProof.label}</p>
        <div className="lp-social-v2__logos">
          {copy.socialProof.logos.map((logo) => (
            <span key={logo} className="lp-social-v2__logo">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="caracteristicas" className="lp-features-v2">
        <div className="lp-features-v2__header">
          <h2 className="lp-features-v2__title">¿Por qué FitSculpt?</h2>
          <p className="lp-features-v2__subtitle">Todo lo que necesitas para transformar tu cuerpo</p>
        </div>
        <div className="lp-features-v2__grid">
          {copy.features.items.map((feature) => (
            <div key={feature.title} className="lp-feature-card-v2">
              <FeatureIcon emoji={feature.iconEmoji} />
              <h3 className="lp-feature-card-v2__title">{feature.title}</h3>
              <p className="lp-feature-card-v2__desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="lp-how-it-works">
        <div className="lp-how-it-works__inner">
          <div className="lp-how-it-works__header">
            <h2 className="lp-how-it-works__title">¿Cómo funciona?</h2>
            <p className="lp-how-it-works__subtitle">En solo 3 pasos estarás listo para transformar tu cuerpo</p>
          </div>
          <div className="lp-how-it-works__steps">
            {copy.howItWorks.steps.map((step, index) => (
              <div key={step.title} className="lp-step-v2">
                <div className="lp-step-v2__number">{index + 1}</div>
                <div className="lp-step-v2__image">
                  <Image
                    src={step.image}
                    alt={step.title}
                    width={280}
                    height={320}
                    className="lp-step-v2__img"
                  />
                </div>
                <h3 className="lp-step-v2__title">{step.title}</h3>
                <p className="lp-step-v2__desc">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="lp-pricing-v2" aria-labelledby="landing-pricing-title">
        <div className="lp-pricing-v2__inner">
          <div className="lp-pricing-v2__header">
            <h2 id="landing-pricing-title" className="lp-pricing-v2__title">{copy.pricing.title}</h2>
            <p className="lp-pricing-v2__subtitle">{copy.pricing.subtitle}</p>
            <p className="lp-pricing-v2__billing-note">Facturacion mensual. Cancela cuando quieras.</p>
          </div>
          <div className="lp-pricing-v2__grid">
            {copy.pricing.tiers.map((tier) => (
              <div
                key={tier.name}
                className={`lp-pricing-card-v2 ${tier.popular ? "lp-pricing-card-v2--popular" : ""}`}
              >
                {tier.popular && <span className="lp-pricing-card-v2__badge">Más Popular</span>}
                <h3 className="lp-pricing-card-v2__name">{tier.name}</h3>
                <div className="lp-pricing-card-v2__price">
                  <span className="lp-pricing-card-v2__amount">{tier.price}</span>
                  <span className="lp-pricing-card-v2__period">{tier.period}</span>
                </div>
                <p className="lp-pricing-card-v2__description">{tier.description}</p>
                <p className="lp-pricing-card-v2__ideal">{tier.idealFor}</p>
                <div className="lp-pricing-card-v2__diffs">
                  <p className="lp-pricing-card-v2__diff-title">Incluye</p>
                  <ul className="lp-pricing-card-v2__diff-list">
                    {tier.includes.map((item) => (
                      <li key={`${tier.name}-in-${item}`} className="lp-pricing-card-v2__diff-item">+ {item}</li>
                    ))}
                  </ul>
                  {tier.excludes.length ? (
                    <>
                      <p className="lp-pricing-card-v2__diff-title">No incluye</p>
                      <ul className="lp-pricing-card-v2__diff-list">
                        {tier.excludes.map((item) => (
                          <li key={`${tier.name}-out-${item}`} className="lp-pricing-card-v2__diff-item lp-pricing-card-v2__diff-item--muted">- {item}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
                <ul className="lp-pricing-card-v2__features">
                  {tier.features.map((feature) => (
                    <li key={feature} className="lp-pricing-card-v2__feature">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" className="lp-pricing-card-v2__check">
                        <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`lp-pricing-card-v2__cta ${tier.popular ? "lp-btn-v2--primary" : "lp-btn-v2--secondary"}`}
                  aria-label={`${tier.cta} - ${tier.name}`}
                  onClick={() => handlePlanClick(tier)}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonios" className="lp-testimonials-v2">
        <div className="lp-testimonials-v2__inner">
          <div className="lp-testimonials-v2__header">
            <h2 className="lp-testimonials-v2__title">Lo que dicen nuestros usuarios</h2>
          </div>
          <div className="lp-testimonials-v2__grid">
            {copy.testimonials.items.map((testimonial) => (
              <div key={testimonial.author} className="lp-testimonial-card-v2">
                <div className="lp-testimonial-card-v2__image">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.author}
                    width={120}
                    height={120}
                    className="lp-testimonial-card-v2__img"
                  />
                </div>
                <div className="lp-testimonial-card-v2__content">
                  <div className="lp-stars-v2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="lp-star-v2">★</span>
                    ))}
                  </div>
                  <p className="lp-testimonial-card-v2__quote">&ldquo;{testimonial.quote}&rdquo;</p>
                  <p className="lp-testimonial-card-v2__author">
                    {testimonial.author}
                    <span className="lp-testimonial-card-v2__role">{testimonial.role}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-cta-v2" aria-labelledby="landing-final-cta-title">
        <div className="lp-cta-v2__inner">
          <h2 id="landing-final-cta-title" className="lp-cta-v2__title">{copy.finalCta.title}</h2>
          <p className="lp-cta-v2__subtitle">{copy.finalCta.subtitle}</p>
          <form
            className="lp-cta-v2__form"
            action="/register"
            method="get"
            onSubmit={() => trackEvent("checkout_start_register_click", { origin: "landing_final_cta", target: "billing" })}
          >
            <input
              className="lp-input-v2"
              type="email"
              name="email"
              autoComplete="email"
              required
              aria-label={copy.finalCta.emailAriaLabel}
              placeholder={copy.finalCta.placeholder}
              suppressHydrationWarning
            />
            <button className="lp-btn-v2 lp-btn-v2--primary" type="submit">
              {copy.finalCta.button}
            </button>
          </form>
          <div className="lp-cta-v2__badges">
            <span className="lp-store-badge-v2" aria-disabled="true">
              <span className="lp-store-badge-v2__icon"></span>
              <span>App Store</span>
            </span>
            <span className="lp-store-badge-v2" aria-disabled="true">
              <span className="lp-store-badge-v2__icon">▶</span>
              <span>Google Play</span>
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer-v2">
        <div className="lp-footer-v2__inner">
          <p className="lp-footer-v2__text">© 2026 FitSculpt. Todos los derechos reservados.</p>
          <div className="lp-footer-v2__links">
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/contacto">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
