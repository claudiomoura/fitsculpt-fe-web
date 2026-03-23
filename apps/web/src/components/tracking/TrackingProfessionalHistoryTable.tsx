import type { DailyNormalizedCheckin } from "@/lib/trackingProfessionalMetrics";
import styles from "./TrackingProfessionalInsights.module.css";

type Props = {
  rows: DailyNormalizedCheckin[];
};

function formatMetric(value: number, suffix: string) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toFixed(1)} ${suffix}`;
}

export default function TrackingProfessionalHistoryTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="muted">Aun no hay suficientes dias normalizados para mostrar un historico profesional.</p>;
  }

  return (
    <div className={styles.historyWrap}>
      <table className={styles.historyTable}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso</th>
            <th>Cintura</th>
            <th>Cadera</th>
            <th>% grasa</th>
            <th>Energia</th>
            <th>Hambre</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className={styles.dateCell}>
                  <strong>{row.date}</strong>
                  {row.sourceCount > 1 ? <span className="muted">{row.sourceCount} entradas</span> : null}
                </div>
              </td>
              <td>{formatMetric(row.weightKg, "kg")}</td>
              <td>{formatMetric(row.waistCm, "cm")}</td>
              <td>{formatMetric(row.hipsCm, "cm")}</td>
              <td>{formatMetric(row.bodyFatPercent, "%")}</td>
              <td>{row.energy > 0 ? row.energy.toFixed(1) : "-"}</td>
              <td>{row.hunger > 0 ? row.hunger.toFixed(1) : "-"}</td>
              <td className={styles.notesCell}>{row.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
