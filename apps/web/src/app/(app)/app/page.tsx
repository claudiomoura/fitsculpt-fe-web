import { getServerT } from "@/lib/serverI18n";

export default function AppHomePage() {
  const { t } = getServerT();
  return (
    <section className="card">
      <h1 className="section-title">{t("app.privateAreaTitle")}</h1>
      <p className="section-subtitle">{t("app.privateAreaSubtitle")}</p>
    </section>
  );
}
