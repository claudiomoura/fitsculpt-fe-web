import Link from "next/link";
import { messages } from "@/lib/i18n";
import { getServerT } from "@/lib/serverI18n";

export default async function HomePage() {
  const { locale } = await getServerT();
  const landing = messages[locale].landing;
  return (
    <div className="page">
      <section className="hero">
        <div style={{ maxWidth: 520, display: "grid", gap: 12 }}>
          <h1>{landing.title}</h1>
          <p className="muted" style={{ fontSize: 18 }}>
            {landing.subtitle}
          </p>
        </div>

        <div className="hero-actions">
          <Link href="/login" className="btn">
            {landing.cta}
          </Link>
          <Link href="/app" className="btn secondary">
            {landing.secondaryCta}
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{landing.highlightsTitle}</h2>
            <p className="section-subtitle">{landing.highlightsSubtitle}</p>
          </div>
        </div>
        <div className="list-grid feature-grid">
          {landing.highlights.map((item) => (
            <article className="feature-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">{landing.stepsTitle}</h2>
            <p className="section-subtitle">{landing.stepsSubtitle}</p>
          </div>
        </div>
        <ol className="steps-list">
          {landing.steps.map((step) => (
            <li className="steps-item" key={step.title}>
              <div className="steps-index" aria-hidden="true" />
              <div>
                <h3>{step.title}</h3>
                <p className="muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
