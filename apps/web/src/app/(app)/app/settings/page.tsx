import { copy } from "@/lib/i18n";

export default function SettingsPage() {
  const c = copy.es;
  return (
    <section>
      <h1>{c.app.settingsTitle}</h1>
      <p>{c.app.settingsSubtitle}</p>
    </section>
  );
}
