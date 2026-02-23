import { getServerT } from "@/lib/serverI18n";
import AdminLabsClient from "./AdminLabsClient";

export default async function AdminLabsPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("adminLabs.title")}</h1>
        <p className="section-subtitle">{t("adminLabs.subtitle")}</p>
      </section>
      <section className="card">
        <AdminLabsClient />
      </section>
    </div>
  );
}
