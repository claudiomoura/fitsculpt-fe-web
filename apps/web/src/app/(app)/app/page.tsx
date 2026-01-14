import { copy } from "@/lib/i18n";

export default function AppHomePage() {
  const c = copy.es;
  return (
    <section>
      <h1>{c.app.privateAreaTitle}</h1>
      <p>{c.app.privateAreaSubtitle}</p>
    </section>
  );
}
