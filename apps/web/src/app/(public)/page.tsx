import Link from "next/link";
import { copy } from "@/lib/i18n";

export default function HomePage() {
  const c = copy.es;
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>{c.landing.title}</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        {c.landing.subtitle}
      </p>

      <Link href="/login">{c.landing.cta}</Link>
    </main>
  );
}
