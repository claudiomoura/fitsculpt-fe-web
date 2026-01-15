import Link from "next/link";
import { copy } from "@/lib/i18n";

export default function HomePage() {
  const c = copy.es;
  return (
    <section
      style={{
        padding: "48px 0",
        display: "grid",
        gap: 20,
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 520, display: "grid", gap: 12 }}>
        <h1 style={{ fontSize: 40, marginBottom: 4 }}>{c.landing.title}</h1>
        <p style={{ color: "#555", fontSize: 18 }}>
          {c.landing.subtitle}
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/login"
          style={{
            background: "#111827",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 999,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {c.landing.cta}
        </Link>
        <Link
          href="/app"
          style={{
            border: "1px solid #d1d5db",
            padding: "10px 18px",
            borderRadius: 999,
            textDecoration: "none",
            color: "#111827",
            fontWeight: 600,
          }}
        >
          {c.landing.secondaryCta}
        </Link>
      </div>
    </section>
  );
}
