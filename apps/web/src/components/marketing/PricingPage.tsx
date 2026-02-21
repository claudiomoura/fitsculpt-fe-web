import Link from "next/link";

type Plan = {
  id: "strength" | "pro" | "nutrition";
  title: string;
  subtitle: string;
  price: string;
  bullets: string[];
  cta: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "strength",
    title: "Strength IA",
    subtitle: "Fuerza, hipertrofia y progresión automática",
    price: "14,99€",
    bullets: [
      "Progresión inteligente de cargas",
      "Rutinas adaptadas a tu nivel",
      "Seguimiento de PRs y volumen",
      "Técnica y cues por ejercicio",
    ],
    cta: "Empezar Strength",
  },
  {
    id: "pro",
    title: "PRO",
    subtitle: "Strength + Nutrition en un solo sistema",
    price: "19,99€",
    bullets: [
      "Todo en Strength IA",
      "Todo en Nutrition IA",
      "Ajustes inteligentes semana a semana",
      "Panel de progreso avanzado",
    ],
    cta: "Elegir Pro",
    highlight: true,
  },
  {
    id: "nutrition",
    title: "Nutrition IA",
    subtitle: "Macros, recetas y adherencia sin complicarte",
    price: "14,99€",
    bullets: [
      "Objetivos de macros automáticos",
      "Recomendaciones de comidas",
      "Ajustes según progreso",
      "Lista de la compra sugerida",
    ],
    cta: "Empezar Nutrition",
  },
];

export default function PricingPage() {
  return (
    <div className="pricing">
      <section className="pricing-hero" id="planes">
        <div className="pricing-hero__inner">
          <h1 className="pricing-title">Planes</h1>
          <p className="pricing-subtitle">
            Cancela cuando quieras. Impuestos incluidos donde aplique.
          </p>
        </div>
      </section>

      <section className="pricing-grid">
        <div className="pricing-grid__inner">
          {PLANS.map((p) => (
            <div key={p.id} className={`plan ${p.highlight ? "plan--highlight" : ""}`}>
              {p.highlight && <div className="plan-badge">Más popular</div>}
              <div className="plan-head">
                <div>
                  <p className="plan-title">{p.title}</p>
                  <p className="plan-sub">{p.subtitle}</p>
                </div>
                <div className="plan-price">{p.price}</div>
              </div>

              <ul className="plan-list">
                {p.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>

              <Link className={`plan-cta ${p.highlight ? "plan-cta--primary" : ""}`} href="/register">
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-info">
        <div className="pricing-info__inner">
          <h2 className="pricing-h2">Todo lo que necesitas para progresar</h2>
          <ul className="pricing-points">
            <li>Planes listos para usar con estructura semanal clara.</li>
            <li>Ajustes alineados con tu progreso y consistencia.</li>
            <li>Seguimiento simple para mantener adherencia sin fricción.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}