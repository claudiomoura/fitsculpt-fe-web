import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>FitSculpt</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Landing page simples (vamos evoluir depois).
      </p>

      <Link href="/login">Ir para Login →</Link>
    </main>
  );
}
