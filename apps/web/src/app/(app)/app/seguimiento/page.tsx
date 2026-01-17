import TrackingClient from "./TrackingClient";
import { copy } from "@/lib/i18n";

export default function TrackingPage() {
  const c = copy.es;

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.trackingTitle}</h1>
        <p className="section-subtitle">{c.app.trackingSubtitle}</p>
      </section>
      <TrackingClient />
    </div>
  );
}
