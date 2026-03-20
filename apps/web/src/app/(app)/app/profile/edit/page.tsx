import { getServerT } from "@/lib/serverI18n";
import ProfileClient from "../ProfileClient";
import styles from "../profileEdit.module.css";

export default async function ProfileEditPage() {
  const { t } = await getServerT();
  return (
    <div className={`page app-page-shell app-page-shell--default ${styles.shell}`}>
      <section className={`card premium-hero-card ${styles.hero}`}>
        <div className="profile-edit-hero-head">
          <div className={styles.badge}>{t("navSections.account")}</div>
          <h1 className="section-title">{t("app.profileTitle")}</h1>
          <p className="section-subtitle">{t("profile.legacySubtitle")}</p>
        </div>
      </section>
      <ProfileClient />
    </div>
  );
}
