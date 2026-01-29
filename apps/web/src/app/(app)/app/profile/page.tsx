import ProfileSummaryClient from "./ProfileSummaryClient";
import { getServerT } from "@/lib/serverI18n";

export default async function ProfilePage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("app.profileTitle")}</h1>
            <p className="section-subtitle">{t("app.profileSubtitle")}</p>
          </div>
        </div>
      </section>
      <ProfileSummaryClient />
    </div>
  );
}
