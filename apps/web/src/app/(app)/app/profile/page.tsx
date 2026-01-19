import ProfileClient from "./ProfileClient";
import { getServerT } from "@/lib/serverI18n";

export default function ProfilePage() {
  const { t } = getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.profileTitle")}</h1>
        <p className="section-subtitle">{t("app.profileSubtitle")}</p>
      </section>
      <ProfileClient />
    </div>
  );
}
