import FeedClient from "./FeedClient";
import { copy } from "@/lib/i18n";

export default function FeedPage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.feedTitle}</h1>
        <p className="section-subtitle">{c.app.feedSubtitle}</p>
      </section>
      <FeedClient />
    </div>
  );
}
