import { getServerT } from "@/lib/serverI18n";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.adminUsersTitle")}</h1>
        <p className="section-subtitle">{t("app.adminUsersSubtitle")}</p>
      </section>
      <section className="card">
        <AdminUsersClient />
      </section>
    </div>
  );
}
