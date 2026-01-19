import FeedClient from "./FeedClient";
import { getServerT } from "@/lib/serverI18n";

export default function FeedPage() {
  const { t } = getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.feedTitle")}</h1>
        <p className="section-subtitle">{t("app.feedSubtitle")}</p>
      </section>
      <FeedClient />
    </div>
  );
}
