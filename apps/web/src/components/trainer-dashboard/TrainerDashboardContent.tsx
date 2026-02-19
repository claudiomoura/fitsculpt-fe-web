import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type TrainerDashboardContentProps = {
  t: (key: string) => string;
};

function TrainerDashboardEmptyState({ description, ctaLabel }: { description: string; ctaLabel: string }) {
  return (
    <div className="form-stack" style={{ alignItems: "flex-start" }}>
      <p className="muted" style={{ margin: 0 }}>{description}</p>
      <Button variant="secondary" disabled>
        {ctaLabel}
      </Button>
    </div>
  );
}

export default function TrainerDashboardContent({ t }: TrainerDashboardContentProps) {
  return (
    <div className="form-stack" aria-live="polite">
      <section aria-labelledby="trainer-kpi-title" className="form-stack">
        <header className="form-stack" style={{ gap: 6 }}>
          <h2 id="trainer-kpi-title" className="section-title" style={{ fontSize: 20 }}>{t("trainer.dashboard.kpi.title")}</h2>
          <p className="muted" style={{ margin: 0 }}>{t("trainer.dashboard.kpi.description")}</p>
        </header>
        <div className="grid" style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {["clients", "sessions", "adherence"].map((metricKey) => (
            <Card key={metricKey}>
              <CardHeader>
                <CardTitle style={{ fontSize: 16 }}>{t(`trainer.dashboard.kpi.cards.${metricKey}.title`)}</CardTitle>
                <CardDescription>{t("trainer.dashboard.shared.noData")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="muted">{t("trainer.dashboard.shared.noDataYet")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="trainer-weekly-activity-title" className="form-stack">
        <Card>
          <CardHeader>
            <CardTitle id="trainer-weekly-activity-title">{t("trainer.dashboard.activity.title")}</CardTitle>
            <CardDescription>{t("trainer.dashboard.activity.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrainerDashboardEmptyState
              description={t("trainer.dashboard.activity.empty")}
              ctaLabel={t("trainer.dashboard.activity.cta")}
            />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="trainer-client-list-title" className="form-stack">
        <Card>
          <CardHeader>
            <CardTitle id="trainer-client-list-title">{t("trainer.dashboard.clients.title")}</CardTitle>
            <CardDescription>{t("trainer.dashboard.clients.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrainerDashboardEmptyState
              description={t("trainer.dashboard.clients.empty")}
              ctaLabel={t("trainer.dashboard.clients.cta")}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
