import WorkoutsClient from "./WorkoutsClient";
import { copy } from "@/lib/i18n";

export default function WorkoutsPage() {
  const c = copy.es;
  return (
    <section>
      <h1>{c.app.workoutsTitle}</h1>
      <p style={{ marginTop: 6 }}>{c.app.workoutsSubtitle}</p>

      <div style={{ marginTop: 16 }}>
        <WorkoutsClient />
      </div>
    </section>
  );
}
