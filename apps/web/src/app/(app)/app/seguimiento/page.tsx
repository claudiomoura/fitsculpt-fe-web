import TrackingClient from "./TrackingClient";
import { getServerT } from "@/lib/serverI18n";

export default function TrackingPage() {
  const { t } = getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.trackingTitle")}</h1>
        <p className="section-subtitle">{t("app.trackingSubtitle")}</p>
      </section>
      <TrackingClient />
    </div>
  );
}
