import ExerciseDetailClient from "./ExerciseDetailClient";

export default function ExerciseDetailPage({ params }: { params: { exerciseId: string } }) {
  return (
    <div className="page">
      <ExerciseDetailClient exerciseId={params.exerciseId} />
    </div>
  );
}
