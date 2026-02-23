import { getServerT } from "@/lib/serverI18n";
import DietPlansClient from "./DietPlansClient";

export default async function DietPlansPage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("dietPlans.title")}</h1>
            <p className="section-subtitle">{t("dietPlans.subtitle")}</p>
          </div>
        </div>
      </section>
      <DietPlansClient />
    </div>
  );
}
