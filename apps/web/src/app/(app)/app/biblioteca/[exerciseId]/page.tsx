import { cookies } from "next/headers";
import type { Exercise } from "@/lib/types";
import { getBackendUrl } from "@/lib/backend";
import ExerciseDetailClient from "./ExerciseDetailClient";
import { getServerT } from "@/lib/serverI18n";


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
    const response = await fetch(`${getBackendUrl()}/exercises/${exerciseId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return { exercise: null, ok: false };
    }
    const data = (await response.json()) as ExerciseApiResponse;
    return { exercise: normalizeExercise(data), ok: true };
  } catch {
    return { exercise: null, ok: false };
  }
}

// Ojo: params es una Promise en Next 16
export default async function ExerciseDetailPage(props: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { t } = await getServerT();
  const { exerciseId } = await props.params;

  if (!exerciseId) {
    return (
      <div className="page">
        <section className="card centered-card">
          <p className="muted">{t("library.loadError")}</p>
        </section>
      </div>
    );
  }

  const { exercise, ok } = await fetchExercise(exerciseId);
  const error = ok ? null : t("library.loadError");

  return (
    <div className="page">
      <ExerciseDetailClient exercise={exercise} error={error} />
    </div>
  );
}
