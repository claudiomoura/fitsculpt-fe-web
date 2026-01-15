import MacrosClient from "./MacrosClient";
import { copy } from "@/lib/i18n";

export default function MacrosPage() {
  const c = copy.es;
  return (
    <section>
      <h1>{c.app.nutritionTitle} · {c.app.macrosTitle}</h1>
      <p style={{ marginTop: 6 }}>{c.app.macrosSubtitle}</p>

      <div style={{ marginTop: 16 }}>
        <MacrosClient />
      </div>
    </section>
  );
}
