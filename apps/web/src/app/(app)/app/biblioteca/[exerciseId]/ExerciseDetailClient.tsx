import Link from "next/link";
import type { Exercise } from "@/lib/types";

function getExerciseMuscles(exercise: Exercise) {
  const main = exercise.mainMuscleGroup ? [exercise.mainMuscleGroup] : [];
  const secondary = Array.isArray(exercise.secondaryMuscleGroups) ? exercise.secondaryMuscleGroups : [];
  const legacyPrimary = Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [];
  const legacySecondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
  return [...main, ...secondary, ...legacyPrimary, ...legacySecondary].filter(Boolean);
}

const fallbackSteps = [
  "Colócate en la posición inicial con postura estable.",
  "Ejecuta el movimiento principal de forma controlada.",
  "Mantén la respiración constante y el core activado.",
  "Regresa a la posición inicial sin perder la técnica.",
];

const fallbackTips = [
  "Mantén la espalda neutra en todo momento.",
  "Evita balanceos o movimientos bruscos.",
  "Ajusta la carga para completar todas las repeticiones con buena forma.",
];

const fallbackMistakes = [
  "Curvar la espalda o perder el control postural.",
  "Bloquear las articulaciones al final del movimiento.",
  "Usar impulso en lugar de fuerza controlada.",
];

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

  const muscles = getExerciseMuscles(exercise);

  return (
    <section className="card" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="form-stack">
        <h1 className="section-title">{exercise.name}</h1>
        <p className="section-subtitle">
          {exercise.description ?? "Guía técnica con foco en seguridad y control."}
        </p>
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
          Aquí irá el vídeo demostrativo.
        </p>
      </div>

      <div className="list-grid" style={{ marginTop: 20 }}>
        <div className="feature-card">
          <h3>Técnica</h3>
          {exercise.technique ? (
            <p className="muted" style={{ marginTop: 8 }}>{exercise.technique}</p>
          ) : (
            <ul className="muted" style={{ marginTop: 8 }}>
              {fallbackSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="feature-card">
          <h3>Consejos</h3>
          {exercise.tips ? (
            <p className="muted" style={{ marginTop: 8 }}>{exercise.tips}</p>
          ) : (
            <ul className="muted" style={{ marginTop: 8 }}>
              {fallbackTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="feature-card">
          <h3>Errores comunes</h3>
          <ul className="muted" style={{ marginTop: 8 }}>
            {fallbackMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
