import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type LandingFeature = {
  title: string;
  description: string;
  iconSrc: string;
  iconAlt: string;
};

type LandingContent = {
  hero: {
    badge: string;
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
  demo: {
    title: string;
    subtitle: string;
    imageAlt: string;
    fallbackLabel: string;
  };
  socialProof: {
    title: string;
    subtitle: string;
    placeholder: string;
  };
  finalCta: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
};

type LandingHomePageProps = {
  content: LandingContent;
};

const SECTION_STYLE = {
  width: "min(1080px, 100%)",
  marginInline: "auto",
};

export function LandingHomePage({ content }: LandingHomePageProps) {
  return (
    <div style={{ display: "grid", gap: "1.25rem", paddingBottom: "2rem" }}>
      <section
        style={{
          ...SECTION_STYLE,
          borderRadius: "24px",
          padding: "clamp(1.25rem, 4vw, 3rem)",
          backgroundImage:
            "linear-gradient(to bottom right, color-mix(in srgb, var(--bg-card) 68%, #0f172a 32%), color-mix(in srgb, var(--bg-card) 72%, #0ea5e9 28%)), url('/assets/hero-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "var(--dni-text-primary)",
          boxShadow: "var(--shadow-md)",
          display: "grid",
          gap: "1rem",
          border: "1px solid color-mix(in srgb, var(--border) 40%, #38bdf8 60%)",
        }}
      >
        <Badge variant="muted" style={{ width: "fit-content" }}>
          {content.hero.badge}
        </Badge>
        <h1 style={{ maxWidth: "16ch" }}>{content.hero.title}</h1>
        <p style={{ margin: 0, color: "var(--dni-text-secondary)", maxWidth: "58ch" }}>{content.hero.subtitle}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <ButtonLink href="/register" size="lg">
            {content.hero.primaryCta}
          </ButtonLink>
          <ButtonLink href="/login" size="lg" variant="secondary">
            {content.hero.secondaryCta}
          </ButtonLink>
        </div>
      </section>

      <section style={SECTION_STYLE} aria-labelledby="landing-features-title">
        <Card>
          <CardHeader>
            <CardTitle id="landing-features-title">{content.features.title}</CardTitle>
            <CardDescription>{content.features.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "0.9rem",
              }}
            >
              {content.features.items.map((feature) => (
                <li key={feature.title}>
                  <Card style={{ height: "100%" }}>
                    <CardHeader>
                      <Image src={feature.iconSrc} alt={feature.iconAlt} width={28} height={28} />
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section style={SECTION_STYLE} aria-labelledby="landing-demo-title">
        <Card>
          <CardHeader>
            <CardTitle id="landing-demo-title">{content.demo.title}</CardTitle>
            <CardDescription>{content.demo.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid var(--border)",
                padding: "0.9rem",
                background: "color-mix(in srgb, var(--bg-muted) 78%, #0ea5e9 22%)",
                display: "grid",
                gap: "0.75rem",
              }}
            >
              <Image
                src="/placeholders/exercise-demo.svg"
                alt={content.demo.imageAlt}
                width={1024}
                height={486}
                style={{ width: "100%", height: "auto" }}
              />
              <small style={{ color: "var(--text-muted)" }}>{content.demo.fallbackLabel}</small>
            </div>
          </CardContent>
        </Card>
      </section>

      <section style={SECTION_STYLE} aria-labelledby="landing-social-proof-title">
        <Card>
          <CardHeader>
            <CardTitle id="landing-social-proof-title">{content.socialProof.title}</CardTitle>
            <CardDescription>{content.socialProof.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="status"
              aria-live="polite"
              style={{
                borderRadius: "16px",
                border: "1px dashed var(--border)",
                padding: "1rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              {content.socialProof.placeholder}
            </div>
          </CardContent>
        </Card>
      </section>

      <section style={SECTION_STYLE} aria-labelledby="landing-final-cta-title">
        <Card
          style={{
            background: "linear-gradient(120deg, color-mix(in srgb, var(--bg-card) 80%, #2dd4bf 20%), color-mix(in srgb, var(--bg-card) 75%, #0ea5e9 25%))",
          }}
        >
          <CardHeader>
            <CardTitle id="landing-final-cta-title">{content.finalCta.title}</CardTitle>
            <CardDescription>{content.finalCta.subtitle}</CardDescription>
          </CardHeader>
          <CardContent style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <ButtonLink href="/register" size="lg">
              {content.finalCta.primaryCta}
            </ButtonLink>
            <ButtonLink href="/app" size="lg" variant="secondary">
              {content.finalCta.secondaryCta}
            </ButtonLink>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
