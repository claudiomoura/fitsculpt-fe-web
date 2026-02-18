import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/landing/Container";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { Section } from "@/components/landing/Section";

export type LandingFeature = {
  title: string;
  description: string;
  iconSrc: string;
  iconAlt: string;
};

export type LandingCopy = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  features: {
    title: string;
    subtitle: string;
    items: LandingFeature[];
  };
  visual: {
    title: string;
    subtitle: string;
    primaryImageAlt: string;
    secondaryImageAlt: string;
  };
  finalCta: {
    title: string;
    subtitle: string;
    primaryCta: string;
  };
};

type LandingHomePageProps = {
  copy: LandingCopy;
};

export function LandingHomePage({ copy }: LandingHomePageProps) {
  return (
    <div className="landing-page-shell">
      <Section className="landing-hero-section">
        <Container className="landing-hero-grid">
          <div className="landing-hero-content">
            <p className="landing-eyebrow">{copy.hero.eyebrow}</p>
            <h1>{copy.hero.title}</h1>
            <p className="landing-subtitle">{copy.hero.subtitle}</p>
            <div className="landing-hero-actions">
              <Link href="/register" className="landing-button landing-button--primary landing-button--lg landing-button--full-mobile">
                {copy.hero.primaryCta}
              </Link>
              <Link href="/pricing" className="landing-button landing-button--secondary landing-button--lg landing-button--full-mobile">
                {copy.hero.secondaryCta}
              </Link>
            </div>
          </div>
          <div className="landing-hero-figure-wrap">
            <Image
              src="/branding/girl_front.png"
              alt="FitSculpt athlete"
              width={620}
              height={760}
              priority
              className="landing-hero-figure"
            />
          </div>
        </Container>
      </Section>

      <Section id="features" aria-labelledby="home-features-title">
        <Container>
          <div className="landing-heading-block">
            <h2 id="home-features-title">{copy.features.title}</h2>
            <p>{copy.features.subtitle}</p>
          </div>
          <ul className="landing-feature-list">
            {copy.features.items.map((feature) => (
              <li key={feature.title}>
                <FeatureCard
                  title={feature.title}
                  description={feature.description}
                  iconSrc={feature.iconSrc}
                  iconAlt={feature.iconAlt}
                />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="home-visual-title">
        <Container>
          <div className="landing-visual-panel">
            <div className="landing-heading-block">
              <h2 id="home-visual-title">{copy.visual.title}</h2>
              <p>{copy.visual.subtitle}</p>
            </div>
            <div className="landing-visual-grid">
              <Image
                src="/branding/girl_back.png"
                alt={copy.visual.primaryImageAlt}
                width={720}
                height={820}
                className="landing-visual-image"
              />
              <Image
                src="/branding/guys.png"
                alt={copy.visual.secondaryImageAlt}
                width={720}
                height={500}
                className="landing-visual-image"
              />
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="landing-final-cta">
            <h2>{copy.finalCta.title}</h2>
            <p>{copy.finalCta.subtitle}</p>
            <Link href="/register" className="landing-button landing-button--primary landing-button--lg">
              {copy.finalCta.primaryCta}
            </Link>
          </div>
        </Container>
      </Section>
    </div>
  );
}
