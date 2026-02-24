import { StatCard } from "@/design-system";

type WeeklyStatsProps = {
  completedExercises: number;
  totalExercises: number;
  estimatedMinutes: number;
};

export default function WeeklyStats({ completedExercises, totalExercises, estimatedMinutes }: WeeklyStatsProps) {
  return (
    <section className="grid gap-3" aria-label="Weekly workout stats">
      <StatCard label="Ejercicios completados" value={`${completedExercises}/${totalExercises}`} />
      <StatCard label="Duración estimada" value={`${estimatedMinutes} min`} />
      <StatCard
        label="Cumplimiento"
        value={`${Math.round((completedExercises / Math.max(totalExercises, 1)) * 100)}%`}
      />
    </section>
  );
}
