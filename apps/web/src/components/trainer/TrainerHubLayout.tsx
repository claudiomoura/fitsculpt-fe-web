"use client";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type TrainerHubLayoutProps = {
  t: (key: string) => string;
  gymName: string | null;
  hasGymRoute?: boolean;
  hasRequestsRoute?: boolean;
};

type HubCard = {
  key: "clients" | "plans" | "requests" | "gym";
  href: string;
};

function TrainerHubEmptyCard({ title, description, ctaLabel, href }: { title: string; description: string; ctaLabel: string; href: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="form-stack" style={{ gap: 10, alignItems: "flex-start" }}>
        <Badge variant="muted">{ctaLabel}</Badge>
        <ButtonLink href={href} variant="secondary">{ctaLabel}</ButtonLink>
      </CardContent>
    </Card>
  );
}

export default function TrainerHubLayout({ t, gymName, hasGymRoute = true, hasRequestsRoute = true }: TrainerHubLayoutProps) {
  const cards: HubCard[] = [
    { key: "clients", href: "/app/trainer/clients" },
    { key: "plans", href: "/app/trainer/plans" },
    ...(hasRequestsRoute ? [{ key: "requests" as const, href: "/app/trainer/requests" }] : []),
    ...(hasGymRoute ? [{ key: "gym" as const, href: "/app/gym" }] : []),
  ];

  return (
    <div className="form-stack" aria-live="polite">
      <Card>
        <CardHeader>
          <CardTitle>{t("trainer.modeTitle")}</CardTitle>
          <CardDescription>{t("trainer.dashboard.header.description")}</CardDescription>
        </CardHeader>
        <CardContent className="form-stack" style={{ gap: 4 }}>
          <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
          {gymName ? <p className="muted" style={{ margin: 0 }}>{gymName}</p> : null}
        </CardContent>
      </Card>

      <section aria-labelledby="trainer-hub-sections-title" className="form-stack">
        <header className="form-stack" style={{ gap: 6 }}>
          <h2 id="trainer-hub-sections-title" className="section-title" style={{ fontSize: 20 }}>{t("trainer.title")}</h2>
          <p className="muted" style={{ margin: 0 }}>{t("trainer.dashboard.header.description")}</p>
        </header>

        <div className="grid" style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {cards.map((card) => (
            <TrainerHubEmptyCard
              key={card.key}
              title={card.key === "clients" ? t("trainer.clients.title") : card.key === "plans" ? t("trainer.plans.title") : card.key === "requests" ? t("trainer.requests.title") : t("nav.gym")}
              description={card.key === "clients" ? t("trainer.clients.empty") : card.key === "plans" ? t("trainer.plans.empty") : card.key === "requests" ? t("trainer.requests.empty") : t("gym.description")}
              ctaLabel={card.key === "clients" ? t("trainer.clients.openList") : card.key === "plans" ? t("trainer.plans.openList") : card.key === "requests" ? t("trainer.requests.openList") : t("ui.open")}
              href={card.href}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="trainer-hub-quick-actions-title" className="form-stack">
        <Card>
          <CardHeader>
            <CardTitle id="trainer-hub-quick-actions-title">{t("quickActions.title")}</CardTitle>
            <CardDescription>{t("quickActions.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid" style={{ gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <ButtonLink href="/app/trainer/clients" variant="secondary">{t("trainer.clients.openList")}</ButtonLink>
              <ButtonLink href="/app/trainer/plans" variant="secondary">{t("trainer.plans.openList")}</ButtonLink>
              {hasRequestsRoute ? <ButtonLink href="/app/trainer/requests" variant="secondary">{t("trainer.requests.openList")}</ButtonLink> : null}
              {hasGymRoute ? <ButtonLink href="/app/gym" variant="secondary">{t("nav.gym")}</ButtonLink> : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
