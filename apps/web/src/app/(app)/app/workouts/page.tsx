import WorkoutsClient from "./WorkoutsClient";
import { copy } from "@/lib/i18n";

export default function WorkoutsPage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.workoutsTitle}</h1>
        <p className="section-subtitle">{c.app.workoutsSubtitle}</p>
      </section>
      <WorkoutsClient />
    </div>
  );
}
