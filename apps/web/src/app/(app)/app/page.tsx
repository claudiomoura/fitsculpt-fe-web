import { ButtonLink } from "@/design-system/components/Button";
import { getServerT } from "@/lib/serverI18n";
import { resolveDefaultAppPath } from "@/lib/server/sessionRole";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function AppHomePage() {
  const defaultAppPath = await resolveDefaultAppPath();

  if (defaultAppPath !== "/app") {
    redirect(defaultAppPath);
  }

  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("dashboard.title")}</h1>
        <p className="section-subtitle">{t("dashboard.subtitle")}</p>
        <div className="inline-actions mt-12">
          <ButtonLink href="/app/hoy">{t("dashboard.kpiGoToday")}</ButtonLink>
          <ButtonLink href="/app/weekly-review" variant="secondary">{t("weeklyReview.title")}</ButtonLink>
        </div>
      </section>
      <DashboardClient />
    </div>
  );
}
