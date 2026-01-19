import { getServerT } from "@/lib/serverI18n";

export default async function SettingsPage() {
  const { t } = await getServerT();
  return (
    <section className="card">
      <h1 className="section-title">{t("app.settingsTitle")}</h1>
      <p className="section-subtitle">{t("app.settingsSubtitle")}</p>
    </section>
  );
}
