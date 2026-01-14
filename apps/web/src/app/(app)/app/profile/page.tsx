import ProfileClient from "./ProfileClient";
import { copy } from "@/lib/i18n";

export default function ProfilePage() {
  const c = copy.es;
  return (
    <section>
      <h1>{c.app.profileTitle}</h1>
      <p>{c.app.profileSubtitle}</p>

      <div style={{ marginTop: 16 }}>
        <ProfileClient />
      </div>
    </section>
  );
}
