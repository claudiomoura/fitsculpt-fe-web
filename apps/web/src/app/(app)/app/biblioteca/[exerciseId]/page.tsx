import { cookies, headers } from "next/headers";
import ExerciseDetailClient from "./ExerciseDetailClient";
import type { Exercise } from "@/lib/types";

function getAppUrl() {
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${protocol}://${host}`;
}

async function fetchExercise(exerciseId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${getAppUrl()}/api/exercises/${exerciseId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { exercise: null, error: "No se pudo cargar el ejercicio." };
    }
    const data = (await response.json()) as Exercise;
    return { exercise: data, error: null };
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
