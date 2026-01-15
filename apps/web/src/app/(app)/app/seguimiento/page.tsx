import TrackingClient from "./TrackingClient";
import { copy } from "@/lib/i18n";

export default function TrackingPage() {
  const c = copy.es;

  return (
    <section>
      <h1>{c.app.trackingTitle}</h1>
      <p style={{ marginTop: 6 }}>{c.app.trackingSubtitle}</p>

      <div style={{ marginTop: 16 }}>
        <TrackingClient />
      </div>
    </section>
  );
}
