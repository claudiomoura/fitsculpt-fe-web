import { getServerT } from "@/lib/serverI18n";
import ProfileClient from "../ProfileClient";

export default async function ProfileEditPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.profileTitle")}</h1>
        <p className="section-subtitle">{t("profile.legacySubtitle")}</p>
      </section>
      <ProfileClient />
    </div>
  );
}
