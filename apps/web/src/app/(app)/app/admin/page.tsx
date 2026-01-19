import { getServerT } from "@/lib/serverI18n";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminPage() {
  const { t } = getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.adminTitle")}</h1>
        <p className="section-subtitle">{t("app.adminSubtitle")}</p>
      </section>
      <section className="card">
        <AdminDashboardClient />
      </section>
    </div>
  );
}
