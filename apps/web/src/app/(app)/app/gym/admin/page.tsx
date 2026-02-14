import { getServerT } from "@/lib/serverI18n";
import GymAdminClient from "@/components/gym/GymAdminClient";

export default async function GymAdminPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("gym.adminTitle")}</h1>
        <p className="section-subtitle">{t("gym.adminSubtitle")}</p>
      </section>
      <GymAdminClient />
    </div>
  );
}
