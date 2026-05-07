"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type ProofPill = {
  label: string;
  value: string;
};

type ProductPillar = {
  eyebrow: string;
  title: string;
  description: string;
};

type MethodStep = {
  title: string;
  description: string;
};

type SignalCard = {
  title: string;
  description: string;
  metric: string;
};

type OutcomeCard = {
  title: string;
  timeframe: string;
  description: string;
  note: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

export type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  includes: string[];
  cta: string;
  popular?: boolean;
};

export type LandingCopy = {
  hero: {
    eyebrow: string;
    title: string;
    accent: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  proof: {
    label: string;
    pills: ProofPill[];
  };
  problem: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: ProductPillar[];
  };
  solution: {
    eyebrow: string;
    title: string;
    subtitle: string;
    benefits: string[];
  };
  method: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: MethodStep[];
  };
  signals: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: SignalCard[];
  };
  outcomes: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: OutcomeCard[];
  };
  faq: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: FaqItem[];
  };
  pricing: {
    title: string;
    subtitle: string;
    billingNote: string;
    tiers: PricingTier[];
  };
  finalCta: {
    title: string;
    subtitle: string;
    placeholder: string;
    button: string;
    emailAriaLabel: string;
    note: string;
  };
};

const defaultCopy: LandingCopy = {
  hero: {
    eyebrow: "AI fitness system",
    title: "Train, eat, and adjust with one adaptive plan.",
    accent: "Built for real progress.",
    subtitle:
      "FitSculpt combines AI training, nutrition guidance, body-scan progress tracking, and weekly reviews so your plan evolves with your actual habits.",
    primaryCta: "Create your plan",
    secondaryCta: "See how it works",
  },
  proof: {
    label: "Product signals, not hype",
    pills: [
      { label: "Plan", value: "Training + nutrition" },
      { label: "Review", value: "Weekly adjustments" },
      { label: "Signals", value: "Body scan + Health Connect" },
      { label: "Access", value: "Mobile-first web app" },
    ],
  },
  problem: {
    eyebrow: "The gap",
    title: "Most fitness apps stop at a static plan.",
    subtitle:
      "A spreadsheet workout and a calorie target are not enough when your sleep, adherence, schedule, and body composition change week by week.",
    items: [
      {
        eyebrow: "Guesswork",
        title: "Your training does not react",
        description: "Miss a session or hit a plateau and the plan usually stays the same.",
      },
      {
        eyebrow: "Friction",
        title: "Nutrition is hard to sustain",
        description: "Rigid meal plans break when real life gets busy or preferences change.",
      },
      {
        eyebrow: "Blind spots",
        title: "Progress is more than scale weight",
        description: "Photos, check-ins, passive activity, and body composition trends matter together.",
      },
      {
        eyebrow: "Noise",
        title: "Too much advice, no weekly decision",
        description: "FitSculpt turns your week into a clear next action instead of another dashboard to decode.",
      },
    ],
  },
  solution: {
    eyebrow: "The FitSculpt loop",
    title: "A premium AI coach experience for training and nutrition.",
    subtitle:
      "Start with a personalized plan, execute the day, capture progress, and let the weekly review decide what should change next.",
    benefits: [
      "Personalized workout structure based on goal, level, equipment, and schedule.",
      "Nutrition guidance with macros, meals, and recipes aligned to the same objective.",
      "Progress tracking with weight, body scan context, energy, notes, and adherence.",
      "Android and Health Connect signals can enrich the picture with passive activity context.",
      "Weekly review turns the data into practical training and nutrition adjustments.",
    ],
  },
  method: {
    eyebrow: "How it works",
    title: "From onboarding to next-week adjustment.",
    subtitle: "The landing flow focuses on the product loop instead of generic motivation or coach portfolio content.",
    steps: [
      {
        title: "Tell FitSculpt your target",
        description: "Set goal, experience, schedule, equipment, food preferences, and constraints.",
      },
      {
        title: "Follow one daily cockpit",
        description: "Open today, train from your plan, check nutrition, and complete the most important action.",
      },
      {
        title: "Capture proof of progress",
        description: "Log check-ins, body scan context, weight, energy, notes, and passive signals where available.",
      },
      {
        title: "Review and adapt weekly",
        description: "FitSculpt highlights what changed and recommends the next adjustment for the coming week.",
      },
    ],
  },
  signals: {
    eyebrow: "Progress intelligence",
    title: "Use the signals that actually explain consistency.",
    subtitle: "No fake transformations or testimonial claims. The page sells the system: better inputs, clearer weekly decisions.",
    cards: [
      {
        title: "Body composition context",
        description: "Body scan surfaces help frame visual change beyond the number on the scale.",
        metric: "scan",
      },
      {
        title: "Adherence trends",
        description: "Training, meals, notes, and check-ins show what you followed and where the week broke down.",
        metric: "week",
      },
      {
        title: "Passive activity signals",
        description: "Android Health Connect can add steps and activity context when the user enables it.",
        metric: "sync",
      },
    ],
  },
  outcomes: {
    eyebrow: "Expected outcomes framework",
    title: "What progress can look like when the loop is used consistently.",
    subtitle:
      "These are illustrative scenarios built from product workflows, not verified customer transformations or guaranteed outcomes.",
    cards: [
      {
        title: "Consistency baseline",
        timeframe: "Weeks 1-2",
        description: "You complete onboarding, lock your training schedule, and establish a repeatable nutrition rhythm.",
        note: "Primary metric: adherence quality across workouts and meals.",
      },
      {
        title: "Early calibration",
        timeframe: "Weeks 3-5",
        description: "Weekly reviews begin adjusting session volume, intensity, and macro targets based on your check-ins.",
        note: "Primary metric: reduced plan friction and better recovery alignment.",
      },
      {
        title: "Compounding execution",
        timeframe: "Weeks 6+",
        description: "You use body metrics and passive signals to make smaller, smarter weekly changes instead of restarting plans.",
        note: "Primary metric: sustained compliance and clearer progress trend lines.",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions before you start",
    subtitle: "FitSculpt focuses on practical product behavior, data control, and billing clarity.",
    items: [
      {
        question: "Is FitSculpt a medical service?",
        answer:
          "No. FitSculpt is a coaching and planning app for fitness and nutrition workflows. It does not provide medical diagnosis, treatment, or emergency support.",
      },
      {
        question: "Do I need to connect Health Connect?",
        answer:
          "No. Health Connect is optional. If you enable it on compatible Android devices, passive activity signals can complement your weekly review.",
      },
      {
        question: "What data can I log in FitSculpt?",
        answer:
          "You can log workouts, nutrition, body metrics, check-ins, notes, and body scan context. You control what you submit and can request deletion from account settings or support.",
      },
      {
        question: "Can I cancel my subscription any time?",
        answer:
          "Yes. Plans are monthly and can be cancelled for the next cycle. Refund eligibility depends on platform billing rules and the policy shown in the Refunds page.",
      },
      {
        question: "Does FitSculpt guarantee specific results?",
        answer:
          "No. Outcomes vary by consistency, recovery, context, and adherence. The product is designed to improve decision quality, not to promise identical body changes.",
      },
    ],
  },
  pricing: {
    title: "Choose your starting point",
    subtitle: "Begin with the module you need now, then upgrade when you want the full loop.",
    billingNote: "Monthly billing. Cancel when you want. Pricing may vary by market.",
    tiers: [
      {
        name: "TrainingAI",
        price: "5.99€",
        period: "/mo",
        description: "AI training plans and progress tracking for focused strength work.",
        includes: ["AI workout planning", "Training calendar", "Progress tracking", "Exercise library"],
        cta: "Start training",
      },
      {
        name: "Pro",
        price: "9.99€",
        period: "/mo",
        description: "The full FitSculpt loop: training, nutrition, coach context, and weekly review.",
        includes: ["TrainingAI + NutriAI", "Weekly review", "Body scan context", "AI coach support"],
        cta: "Choose Pro",
        popular: true,
      },
      {
        name: "NutriAI",
        price: "5.99€",
        period: "/mo",
        description: "Nutrition planning, macros, meals, and recipes aligned to your goal.",
        includes: ["AI nutrition plans", "Macros and meals", "Recipe guidance", "Nutrition tracking"],
        cta: "Start nutrition",
      },
    ],
  },
  finalCta: {
    title: "Build your first FitSculpt plan.",
    subtitle: "Create an account and start with a product flow designed around your next week, not a generic promise.",
    placeholder: "you@email.com",
    button: "Create account",
    emailAriaLabel: "Enter your email to create your FitSculpt account",
    note: "No fake before-and-after claims. Your results depend on consistency, context, and recovery.",
  },
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="fs-landing-check">
      <path d="M13.5 4.5 6 12 2.5 8.5" />
    </svg>
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
    <main className="fs-landing" aria-labelledby="landing-hero-title">
      <section className="fs-hero">
        <div className="fs-hero__media" aria-hidden="true">
          <Image src="/branding/background.png" alt="" fill priority className="fs-hero__bg fs-hero__bg--desktop" sizes="100vw" />
          <Image src="/branding/girl_front.png" alt="" fill priority className="fs-hero__bg fs-hero__bg--mobile" sizes="100vw" />
          <div className="fs-hero__overlay" />
        </div>

        <div className="fs-landing__container fs-hero__grid">
          <div className="fs-hero__content">
            <div className="fs-landing-eyebrow">
              <span className="fs-landing-eyebrow__dot" />
              {copy.hero.eyebrow}
            </div>
            <h1 id="landing-hero-title" className="fs-hero__title">
              {copy.hero.title} <span>{copy.hero.accent}</span>
            </h1>
            <p className="fs-hero__subtitle">{copy.hero.subtitle}</p>
            <div className="fs-hero__actions">
              <Link href="/register" className="fs-landing-btn fs-landing-btn--primary" onClick={handleHeroPrimaryClick}>
                {copy.hero.primaryCta}
              </Link>
              <Link href="#como-funciona" className="fs-landing-btn fs-landing-btn--glass">
                {copy.hero.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="fs-hero-phone" aria-label="FitSculpt app preview">
            <div className="fs-hero-phone__chrome">
              <div className="fs-hero-phone__topline">
                <span>Today</span>
                <strong>84%</strong>
              </div>
              <div className="fs-hero-phone__score">
                <span>Weekly readiness</span>
                <strong>Adjust volume + keep macros</strong>
              </div>
              <div className="fs-hero-phone__imageWrap">
                <Image
                  src="/branding/girl_front.png"
                  alt="FitSculpt body scan preview"
                  width={360}
                  height={460}
                  priority
                  className="fs-hero-phone__image"
                />
              </div>
              <div className="fs-hero-phone__cards">
                <span>Training ready</span>
                <span>Macros aligned</span>
                <span>Body scan logged</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fs-proof" aria-label={copy.proof.label}>
        <div className="fs-landing__container fs-proof__inner">
          <p>{copy.proof.label}</p>
          <div className="fs-proof__pills">
            {copy.proof.pills.map((pill) => (
              <div key={pill.label} className="fs-proof-pill">
                <span>{pill.label}</span>
                <strong>{pill.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fs-section fs-section--dark" aria-labelledby="landing-problem-title">
        <div className="fs-landing__container">
          <div className="fs-section-heading fs-section-heading--center">
            <p className="fs-section-kicker">{copy.problem.eyebrow}</p>
            <h2 id="landing-problem-title">{copy.problem.title}</h2>
            <p>{copy.problem.subtitle}</p>
          </div>
          <div className="fs-problem-grid">
            {copy.problem.items.map((item) => (
              <article key={item.title} className="fs-problem-card">
                <span>{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="fs-section fs-solution" aria-labelledby="landing-solution-title">
        <div className="fs-landing__container fs-solution__grid">
          <div className="fs-solution__visual">
            <Image src="/branding/guys.png" alt="FitSculpt training preview" width={520} height={640} className="fs-solution__image" />
            <div className="fs-solution__float fs-solution__float--top">AI plan updated</div>
            <div className="fs-solution__float fs-solution__float--bottom">Next week: +1 session if recovery holds</div>
          </div>
          <div className="fs-solution__content">
            <p className="fs-section-kicker">{copy.solution.eyebrow}</p>
            <h2 id="landing-solution-title">{copy.solution.title}</h2>
            <p>{copy.solution.subtitle}</p>
            <ul className="fs-benefit-list">
              {copy.solution.benefits.map((benefit) => (
                <li key={benefit}>
                  <CheckIcon />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="fs-landing-btn fs-landing-btn--primary">
              {copy.hero.primaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="fs-section fs-method" aria-labelledby="landing-method-title">
        <div className="fs-landing__container">
          <div className="fs-section-heading">
            <p className="fs-section-kicker">{copy.method.eyebrow}</p>
            <h2 id="landing-method-title">{copy.method.title}</h2>
            <p>{copy.method.subtitle}</p>
          </div>
          <div className="fs-method__steps">
            {copy.method.steps.map((step, index) => (
              <article key={step.title} className="fs-method-step">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="resultados" className="fs-section fs-signals" aria-labelledby="landing-signals-title">
        <div className="fs-landing__container fs-signals__grid">
          <div className="fs-section-heading">
            <p className="fs-section-kicker">{copy.signals.eyebrow}</p>
            <h2 id="landing-signals-title">{copy.signals.title}</h2>
            <p>{copy.signals.subtitle}</p>
          </div>
          <div className="fs-signal-cards">
            {copy.signals.cards.map((card) => (
              <article key={card.title} className="fs-signal-card">
                <strong>{card.metric}</strong>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fs-section fs-outcomes" aria-labelledby="landing-outcomes-title">
        <div className="fs-landing__container">
          <div className="fs-section-heading fs-section-heading--center">
            <p className="fs-section-kicker">{copy.outcomes.eyebrow}</p>
            <h2 id="landing-outcomes-title">{copy.outcomes.title}</h2>
            <p>{copy.outcomes.subtitle}</p>
          </div>
          <div className="fs-outcomes__grid">
            {copy.outcomes.cards.map((card) => (
              <article key={card.title} className="fs-outcome-card">
                <span>{card.timeframe}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <small>{card.note}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="fs-section fs-faq" aria-labelledby="landing-faq-title">
        <div className="fs-landing__container">
          <div className="fs-section-heading fs-section-heading--center">
            <p className="fs-section-kicker">{copy.faq.eyebrow}</p>
            <h2 id="landing-faq-title">{copy.faq.title}</h2>
            <p>{copy.faq.subtitle}</p>
          </div>
          <div className="fs-faq__list">
            {copy.faq.items.map((item) => (
              <details key={item.question} className="fs-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="fs-section fs-pricing" aria-labelledby="landing-pricing-title">
        <div className="fs-landing__container">
          <div className="fs-section-heading fs-section-heading--center">
            <p className="fs-section-kicker">Plans</p>
            <h2 id="landing-pricing-title">{copy.pricing.title}</h2>
            <p>{copy.pricing.subtitle}</p>
            <small>{copy.pricing.billingNote}</small>
          </div>
          <div className="fs-pricing__grid">
            {copy.pricing.tiers.map((tier) => (
              <article key={tier.name} className={`fs-price-card ${tier.popular ? "fs-price-card--featured" : ""}`}>
                {tier.popular ? <span className="fs-price-card__badge">Best fit</span> : null}
                <h3>{tier.name}</h3>
                <div className="fs-price-card__price">
                  <strong>{tier.price}</strong>
                  <span>{tier.period}</span>
                </div>
                <p>{tier.description}</p>
                <ul>
                  {tier.includes.map((item) => (
                    <li key={item}>
                      <CheckIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="fs-landing-btn fs-landing-btn--price" onClick={() => handlePlanClick(tier)}>
                  {tier.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fs-final" aria-labelledby="landing-final-title">
        <div className="fs-landing__container fs-final__card">
          <h2 id="landing-final-title">{copy.finalCta.title}</h2>
          <p>{copy.finalCta.subtitle}</p>
          <form
            className="fs-final__form"
            action="/register"
            method="get"
            onSubmit={() => trackEvent("checkout_start_register_click", { origin: "landing_final_cta", target: "billing" })}
          >
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              aria-label={copy.finalCta.emailAriaLabel}
              placeholder={copy.finalCta.placeholder}
              suppressHydrationWarning
            />
            <button type="submit" className="fs-landing-btn fs-landing-btn--primary">
              {copy.finalCta.button}
            </button>
          </form>
          <small>{copy.finalCta.note}</small>
        </div>
      </section>

    </main>
  );
}
