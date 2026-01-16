import ProfileClient from "./ProfileClient";
import { copy } from "@/lib/i18n";

export default function ProfilePage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.profileTitle}</h1>
        <p className="section-subtitle">{c.app.profileSubtitle}</p>
      </section>
      <ProfileClient />
    </div>
  );
}
