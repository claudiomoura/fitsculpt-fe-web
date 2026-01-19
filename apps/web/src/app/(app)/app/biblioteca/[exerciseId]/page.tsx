import { existsSync } from "fs";
import path from "path";
import { cookies } from "next/headers";
import type { Exercise } from "@/lib/types";
import { slugifyExerciseName } from "@/lib/slugify";
import ExerciseDetailClient from "./ExerciseDetailClient";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type ExerciseApiResponse = Exercise & {
  mainMuscleGroup?: string | null;
  secondaryMuscleGroups?: string[] | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  slug?: string | null;
};

function normalizeExercise(data: ExerciseApiResponse): Exercise {
  return {
    ...data,
    primaryMuscles: data.primaryMuscles ?? (data.mainMuscleGroup ? [data.mainMuscleGroup] : undefined),
    secondaryMuscles: data.secondaryMuscles ?? data.secondaryMuscleGroups ?? undefined,
  };
}

async function fetchExercise(exerciseId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${APP_URL}/api/exercises/${exerciseId}` as string, {
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
}) {
  const { exerciseId } = await props.params;

  if (!exerciseId) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">No se pudo cargar el ejercicio.</p>
        </section>
      </div>
    );
  }

  const { exercise, error } = await fetchExercise(exerciseId);
  const slug = exercise?.slug || (exercise?.name ? slugifyExerciseName(exercise.name) : null);
  const mediaUrl = slug ? `/exercises/${slug}.gif` : null;
  const mediaPath = slug
    ? path.join(process.cwd(), "public", "exercises", `${slug}.gif`)
    : null;
  const hasMedia = mediaPath ? existsSync(mediaPath) : false;

  return (
    <div className="page">
      <ExerciseDetailClient
        exercise={exercise}
        error={error}
        mediaUrl={mediaUrl}
        hasMedia={hasMedia}
      />
    </div>
  );
}
