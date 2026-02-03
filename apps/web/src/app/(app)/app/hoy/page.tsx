import { getServerT } from "@/lib/serverI18n";
import TodaySummaryClient from "./TodaySummaryClient";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <div className="page-header">
          <div className="page-header-body">
            <h1 className="section-title">{t("today.title")}</h1>
            <p className="section-subtitle">{t("today.subtitle")}</p>
          </div>
        </div>
      </section>
      <TodaySummaryClient />
    </div>
  );
}
