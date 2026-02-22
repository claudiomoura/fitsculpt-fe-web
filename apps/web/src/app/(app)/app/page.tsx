import { ButtonLink } from "@/components/ui/Button";
import { getServerT } from "@/lib/serverI18n";
import DashboardClient from "./DashboardClient";

export default async function AppHomePage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("dashboard.title")}</h1>
        <p className="section-subtitle">{t("dashboard.subtitle")}</p>
      </section>
      <section className="card">
        <ButtonLink href="/app/weekly-review" variant="secondary">{t("weeklyReview.title")}</ButtonLink>
      </section>
      <DashboardClient />
    </div>
  );
}
