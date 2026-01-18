import Link from "next/link";

type Exercise = {
  id: string;
  name: string;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description?: string | null;
};

type ExerciseDetailClientProps = {
  exercise: Exercise | null;
  error?: string | null;
};

export default function ExerciseDetailClient({ exercise, error }: ExerciseDetailClientProps) {
  if (error || !exercise) {
    return (
      <section className="card" style={{ maxWidth: 860, margin: "0 auto" }}>
        <p className="muted">{error ?? "No se pudo cargar el ejercicio."}</p>
        <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/biblioteca">
          Volver a la biblioteca
        </Link>
      </section>
    );
  }

  const muscles = [...(exercise.primaryMuscles ?? []), ...(exercise.secondaryMuscles ?? [])];
  const description =
    exercise.description ?? "Sin descripción disponible. Pronto añadiremos vídeo y técnica paso a paso.";

  return (
    <section className="card" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="form-stack">
        <h1 className="section-title">{exercise.name}</h1>
        <p className="section-subtitle">{description}</p>
      </div>

      <div className="badge-list" style={{ marginTop: 12 }}>
        {muscles.length > 0 ? (
          muscles.map((muscle) => (
            <span key={muscle} className="badge">
              {muscle}
            </span>
          ))
        ) : (
          <span className="badge">Sin datos musculares</span>
        )}
      </div>

      <p className="muted" style={{ marginTop: 8 }}>
        Equipamiento: {exercise.equipment ?? "Sin especificar"}
      </p>

      <div
        className="card"
        style={{
          marginTop: 20,
          background: "rgba(255,255,255,0.03)",
          borderStyle: "dashed",
        }}
      >
        <p className="muted" style={{ textAlign: "center" }}>
          Aquí irá el vídeo o GIF de demostración.
        </p>
      </div>

      <Link className="btn" style={{ width: "fit-content", marginTop: 20 }} href="/app/biblioteca">
        Volver a la biblioteca
      </Link>
    </section>
  );
}
