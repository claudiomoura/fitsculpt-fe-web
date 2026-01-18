import { cookies } from "next/headers";
import ExerciseDetailClient from "./ExerciseDetailClient";

type Exercise = {
  id: string;
  name: string;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description?: string | null;
};

type ExerciseApiResponse = Exercise & {
  mainMuscleGroup?: string | null;
  secondaryMuscleGroups?: string[] | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function normalizeExercise(data: ExerciseApiResponse): Exercise {
  const primaryMuscles = data.primaryMuscles ?? (data.mainMuscleGroup ? [data.mainMuscleGroup] : []);
  const secondaryMuscles = data.secondaryMuscles ?? data.secondaryMuscleGroups ?? [];
  return {
    id: data.id,
    name: data.name,
    equipment: data.equipment ?? null,
    description: data.description ?? null,
    primaryMuscles,
    secondaryMuscles,
  };
}

async function fetchExercise(exerciseId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${APP_URL}/api/exercises/${exerciseId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { exercise: null, error: "No se pudo cargar el ejercicio." };
    }
    const data = (await response.json()) as ExerciseApiResponse;
    return { exercise: normalizeExercise(data), error: null };
  } catch {
    return { exercise: null, error: "No se pudo cargar el ejercicio." };
  }
}

// Ojo: params es una Promise en Next 16
export default async function ExerciseDetailPage(props: {
  params: Promise<{ exerciseId: string }>;
}): Promise<ReactNode> {
  const { exerciseId } = await props.params;

  if (!exerciseId) {
    return (
      <section className="card">
        <p>No se pudo cargar el ejercicio.</p>
      </section>
    );
  }

  const exercise = await fetchExercise(exerciseId);

  if (!exercise) {
    return (
      <section className="card">
        <p>No se pudo cargar el ejercicio.</p>
        <a href="/app/biblioteca" className="btn-link">
          Volver a la biblioteca
        </a>
      </section>
    );
  }

  const muscles = [...(exercise.primaryMuscles ?? []), ...(exercise.secondaryMuscles ?? [])];

  return (
    <div className="page">
      <section className="card">
        <h1>{exercise.name}</h1>
        <p className="muted">Equipamiento: {exercise.equipment ?? "Sin especificar"}</p>

        <div className="badge-list" style={{ marginTop: 12 }}>
          {muscles.length > 0 ? (
            muscles.map((m) => (
              <span key={m} className="badge">
                {m}
              </span>
            ))
          ) : (
            <span className="badge">General</span>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <h2>Descripción</h2>
          <p className="muted">
            {exercise.description ?? "Sin descripción disponible. Pronto añadiremos vídeo y técnica paso a paso."}
          </p>
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #eee",
          }}
        >
          <p className="muted">
            Aquí irá la demo en vídeo o GIF, como en FitnessAI, para que el usuario vea la técnica.
          </p>
        </div>

        <a href="/app/biblioteca" className="btn-link" style={{ marginTop: 24, display: "inline-block" }}>
          Volver a la biblioteca
        </a>
      </section>
    </div>
  );
}
