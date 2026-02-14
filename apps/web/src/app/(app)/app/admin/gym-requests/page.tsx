import { getServerT } from "@/lib/serverI18n";
import GymJoinRequestsManager from "@/components/admin/GymJoinRequestsManager";

export default async function AdminGymRequestsPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("admin.gymRequestsTitle")}</h1>
        <p className="section-subtitle">{t("admin.gymRequestsSubtitle")}</p>
      </section>
      <section className="card">
        <GymJoinRequestsManager />
      </section>
    </div>
  );
}
