import { getServerT } from "@/lib/serverI18n";
import DashboardClient from "../DashboardClient";

export default async function DashboardPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("dashboard.title")}</h1>
            <p className="section-subtitle">{t("dashboard.subtitle")}</p>
          </div>
        </div>
      </section>
      <DashboardClient />
    </div>
  );
}
