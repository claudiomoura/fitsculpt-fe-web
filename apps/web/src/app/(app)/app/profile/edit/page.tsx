import { getServerT } from "@/lib/serverI18n";
import ProfileClient from "../ProfileClient";

export default async function ProfileEditPage() {
  const { t } = await getServerT();
  return (
    <div className="page profile-edit-shell">
      <section className="card profile-edit-hero">
        <div className="profile-edit-hero-head">
          <div className="profile-edit-badge">Cuenta</div>
          <h1 className="section-title">{t("app.profileTitle")}</h1>
          <p className="section-subtitle">{t("profile.legacySubtitle")}</p>
        </div>
      </section>
      <ProfileClient />
    </div>
  );
}
