import { copy } from "@/lib/i18n";
import AdminUsersClient from "./AdminUsersClient";

export default function AdminUsersPage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.nav.admin}</h1>
        <p className="section-subtitle">{c.app.adminSubtitle}</p>
      </section>
      <section className="card">
        <AdminUsersClient />
      </section>
    </div>
  );
}
