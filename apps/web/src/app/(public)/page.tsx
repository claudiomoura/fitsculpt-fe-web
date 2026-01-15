import Link from "next/link";
import { copy } from "@/lib/i18n";

export default function HomePage() {
  const c = copy.es;
  return (
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
  );
}
