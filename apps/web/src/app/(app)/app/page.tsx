import { copy } from "@/lib/i18n";

export default function AppHomePage() {
  const c = copy.es;
  return (
    <section className="card">
      <h1 className="section-title">{c.app.privateAreaTitle}</h1>
      <p className="section-subtitle">{c.app.privateAreaSubtitle}</p>
    </section>
  );
}
