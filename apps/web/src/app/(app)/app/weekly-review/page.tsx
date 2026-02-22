import { getServerT } from "@/lib/serverI18n";
import WeeklyReviewClient from "@/components/weekly-review/WeeklyReviewClient";

export default async function WeeklyReviewPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("weeklyReview.title")}</h1>
        <p className="section-subtitle">{t("weeklyReview.subtitle")}</p>
      </section>
      <WeeklyReviewClient />
    </div>
  );
}
