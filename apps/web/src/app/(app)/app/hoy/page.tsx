import { getServerT } from "@/lib/serverI18n";
import TodaySummaryClient from "./TodaySummaryClient";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("today.title")}</h1>
        <p className="section-subtitle">{t("today.subtitle")}</p>
      </section>
      <TodaySummaryClient />
    </div>
  );
}
