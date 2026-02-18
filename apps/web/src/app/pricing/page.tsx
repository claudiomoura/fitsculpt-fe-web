import { Container } from "@/components/landing/Container";
import { PricingCard } from "@/components/landing/PricingCard";
import { Section } from "@/components/landing/Section";

type PlanCopy = {
  name: string;
  summary: string;
  details: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
};

const PRICING_COPY = {
  hero: {
    title: "Choose Your Plan.",
    subtitle: "Train smarter. Progress faster.",
  },
  plans: [
    {
      name: "Free",
      summary: "For getting started",
      details: "See details",
      features: ["Core dashboard access", "Basic training tracking", "Starter nutrition logging"],
      ctaLabel: "Get started",
      ctaHref: "/register",
    },
    {
      name: "Pro",
      summary: "For committed athletes",
      details: "Custom pricing",
      features: ["Adaptive AI training guidance", "Advanced analytics and progress views", "Nutrition optimization workflows"],
      ctaLabel: "Request access",
      ctaHref: "/register",
      highlighted: true,
    },
    {
      name: "Elite",
      summary: "For high-performance coaching",
      details: "Custom pricing",
      features: ["Priority performance support", "Expanded program controls", "Team and trainer collaboration tools"],
      ctaLabel: "Contact team",
      ctaHref: "/register",
    },
  ] satisfies PlanCopy[],
};

export default function PricingPage() {
  return (
    <div className="landing-page-shell">
      <Section>
        <Container>
          <div className="landing-heading-block landing-pricing-hero">
            <h1>{PRICING_COPY.hero.title}</h1>
            <p>{PRICING_COPY.hero.subtitle}</p>
          </div>
          <div className="landing-pricing-grid">
            {PRICING_COPY.plans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
        </Container>
      </Section>
    </div>
  );
}
