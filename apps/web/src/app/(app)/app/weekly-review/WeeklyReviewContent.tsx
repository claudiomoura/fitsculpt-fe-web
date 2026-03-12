import WeeklyReviewClient from "@/components/weekly-review/WeeklyReviewClient";
import { getServerT } from "@/lib/serverI18n";

export default async function WeeklyReviewContent() {
  const { t } = await getServerT();

  return (
    <>
      <section className="card">
        <h1 className="section-title">{t("weeklyReview.title")}</h1>
        <p className="section-subtitle">{t("weeklyReview.subtitle")}</p>
      </section>
      <WeeklyReviewClient />
    </>
  );
}
