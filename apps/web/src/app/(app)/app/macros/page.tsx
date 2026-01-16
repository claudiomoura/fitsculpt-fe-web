import MacrosClient from "./MacrosClient";
import { copy } from "@/lib/i18n";

export default function MacrosPage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.macrosTitle}</h1>
        <p className="section-subtitle">{c.app.macrosSubtitle}</p>
      </section>
      <MacrosClient />
    </div>
  );
}
