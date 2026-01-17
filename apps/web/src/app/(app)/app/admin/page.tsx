import { copy } from "@/lib/i18n";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminPage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.adminTitle}</h1>
        <p className="section-subtitle">{c.app.adminSubtitle}</p>
      </section>
      <section className="card">
        <AdminDashboardClient />
      </section>
    </div>
  );
}
