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

export default async function ExerciseDetailPage(props: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await props.params;
  if (!exerciseId) {
    return (
      <div className="page">
        <ExerciseDetailClient exercise={null} error="No se pudo cargar el ejercicio." />
      </div>
    );
  }

  const { exercise, error } = await fetchExercise(exerciseId);
  return (
    <div className="page">
      <ExerciseDetailClient exercise={exercise} error={error} />
    </div>
  );
}
