import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/surfaces/SectionHeader";
import DashboardClient from "../DashboardClient";

export default async function DashboardPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <SectionHeader
          className="section-head--card"
          title={t("dashboard.title")}
          subtitle={t("dashboard.subtitle")}
          actions={
            <>
              <ButtonLink variant="ghost" href="/app/hoy">
                {t("dashboard.kpiGoToday")}
              </ButtonLink>
              <ButtonLink variant="secondary" href="/app/seguimiento">
                {t("dashboard.progressCta")}
              </ButtonLink>
            </>
          }
        />
      </section>
      <DashboardClient />
    </div>
  );
}
