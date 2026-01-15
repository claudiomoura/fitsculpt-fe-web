import Link from "next/link";
import { copy } from "@/lib/i18n";

export default function HomePage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="hero">
        <div style={{ maxWidth: 520, display: "grid", gap: 12 }}>
          <h1>{c.landing.title}</h1>
          <p className="muted" style={{ fontSize: 18 }}>
            {c.landing.subtitle}
          </p>
        </div>

        <div className="hero-actions">
          <Link href="/login" className="btn">
            {c.landing.cta}
          </Link>
          <Link href="/app" className="btn secondary">
            {c.landing.secondaryCta}
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{c.landing.highlightsTitle}</h2>
            <p className="section-subtitle">{c.landing.highlightsSubtitle}</p>
          </div>
        </div>
        <div className="list-grid feature-grid">
          {c.landing.highlights.map((item) => (
            <article className="feature-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
