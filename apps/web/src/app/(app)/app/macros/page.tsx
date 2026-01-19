import MacrosClient from "./MacrosClient";
import { getServerT } from "@/lib/serverI18n";

export default function MacrosPage() {
  const { t } = getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.macrosTitle")}</h1>
        <p className="section-subtitle">{t("app.macrosSubtitle")}</p>
      </section>
      <MacrosClient />
    </div>
  );
}
