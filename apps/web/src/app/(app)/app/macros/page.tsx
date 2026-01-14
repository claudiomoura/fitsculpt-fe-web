import MacrosClient from "./MacrosClient";

export default function MacrosPage() {
  return (
    <section>
      <h1>Calculadora de calorias e macros</h1>
      <p style={{ marginTop: 6 }}>
        Estimativa de TDEE (Mifflin-St Jeor) com alvo e distribuição de macros.
      </p>

      <div style={{ marginTop: 16 }}>
        <MacrosClient />
      </div>
    </section>
  );
}
