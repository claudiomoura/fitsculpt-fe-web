import TrackingClient from "./TrackingClient";
import { getServerT } from "@/lib/serverI18n";
import Link from "next/link";

export default async function TrackingPage() {
  const { t } = await getServerT();

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("app.trackingTitle")}</h1>
        <p className="section-subtitle">{t("app.trackingSubtitle")}</p>
        <div style={{ marginTop: 12 }}>
          <Link href="/app/seguimiento/check-in" className="btn fit-content">
            {t("tracking.progressEmptyCta")}
          </Link>
        </div>
      </section>
      <TrackingClient />
    </div>
  );
}
