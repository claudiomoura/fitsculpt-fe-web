import { messages } from "@/lib/i18n";
import { getServerT } from "@/lib/serverI18n";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";

export default async function HomePage() {
  const ICON_MAP: Record<string, IconName> = {
  sparkles: "sparkles",
  dumbbell: "dumbbell",
  book: "book",
  info: "info",
  warning: "warning",
  check: "check",
  close: "close",
  "chevron-down": "chevron-down",
};
  const { locale } = await getServerT();
  const landing = messages[locale].landing;
  return (
    <div className="page">
      <section className="hero hero-section">
        <div className="hero-content">
          <Badge variant="muted">{landing.heroBadge}</Badge>
          <h1>{landing.title}</h1>
          <p className="section-subtitle">{landing.subtitle}</p>
          <ul className="hero-bullets">
            {landing.heroBullets.map((item) => (
              <li key={item} className="hero-bullet">
                <span className="hero-bullet-icon">
                  <Icon name="check" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="hero-actions">
            <ButtonLink href="/register" size="lg">
              {landing.cta}
            </ButtonLink>
            <ButtonLink href="/app" variant="secondary" size="lg">
              {landing.secondaryCta}
            </ButtonLink>
          </div>
        </div>
        <Card className="feature-card">
          <CardHeader>
            <CardTitle>{landing.heroPreviewTitle}</CardTitle>
            <CardDescription>{landing.heroPreviewSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="stack-md">
            {landing.heroPreviewStats.map((stat) => (
              <div key={stat.label} className="inline-actions-sm">
                <span className="badge">{stat.label}</span>
                <span className="muted">{stat.value}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Badge>{landing.heroPreviewBadge}</Badge>
          </CardFooter>
        </Card>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{landing.stepsTitle}</h2>
            <p className="section-subtitle">{landing.stepsSubtitle}</p>
          </div>
        </div>
        <div className="list-grid feature-grid">
          {landing.steps.map((step) => (
            <Card key={step.title} className="feature-card">
              <CardHeader>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{landing.highlightsTitle}</h2>
            <p className="section-subtitle">{landing.highlightsSubtitle}</p>
          </div>
        </div>
        <div className="list-grid feature-grid">
          {landing.highlights.map((item) => (
            <Card className="feature-card" key={item.title}>
              <CardHeader>
                <div className="hero-bullet-icon">
                  <Icon name={ICON_MAP[item.icon] ?? "info"} />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{landing.valueTitle}</h2>
            <p className="section-subtitle">{landing.valueSubtitle}</p>
          </div>
        </div>
        <div className="list-grid">
          {landing.valueProps.map((item) => (
            <Card key={item.title} className="feature-card">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="badge-list">
                {item.badges.map((badge) => (
                  <Badge key={badge}>{badge}</Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{landing.plansTitle}</h2>
            <p className="section-subtitle">{landing.plansSubtitle}</p>
          </div>
        </div>
        <div className="plans-grid">
          {landing.plans.map((plan) => (
            <Card key={plan.title} className={`plan-card ${plan.featured ? "is-featured" : ""}`}>
              <CardHeader>
                <Badge variant={plan.featured ? "success" : "muted"}>{plan.badge}</Badge>
                <CardTitle>{plan.title}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="stack-md">
                <div className="plan-price">{plan.price}</div>
                <ul className="plan-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Icon name="check" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <ButtonLink href={plan.ctaHref} variant={plan.featured ? "primary" : "secondary"}>
                  {plan.ctaLabel}
                </ButtonLink>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
