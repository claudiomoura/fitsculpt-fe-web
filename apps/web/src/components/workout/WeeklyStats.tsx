type WeeklyStatsProps = {
  completedExercises: number;
  totalExercises: number;
  estimatedMinutes: number;
};

export default function WeeklyStats({ completedExercises, totalExercises, estimatedMinutes }: WeeklyStatsProps) {
  return (
    <section className="card stack-sm" aria-label="Weekly workout stats">
      <h3 className="section-title section-title-sm m-0">Resumen rápido</h3>
      <div className="info-grid">
        <div className="info-item">
          <div className="info-label">Ejercicios completados</div>
          <div className="info-value">{completedExercises}/{totalExercises}</div>
        </div>
        <div className="info-item">
          <div className="info-label">Duración estimada</div>
          <div className="info-value">{estimatedMinutes} min</div>
        </div>
      </div>
    </section>
  );
}
