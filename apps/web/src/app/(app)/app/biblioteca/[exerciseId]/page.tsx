import type { Exercise } from "@/lib/types";
import ExerciseDetailClient from "./ExerciseDetailClient";
import { getServerT } from "@/lib/serverI18n";
import { ExerciseDetailErrorState } from "@/components/exercise-library";
import { headers } from "next/headers";


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
    const requestHeaders = await headers();
    const host = requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    if (!host) {
      return { exercise: null, ok: false };
    }
    const cookie = requestHeaders.get("cookie");
    const response = await fetch(`${protocol}://${host}/api/exercises/${exerciseId}`, {
      headers: cookie ? { cookie } : undefined,
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
        <ExerciseDetailErrorState
          title={t("exerciseDetail.errorTitle")}
          description={t("library.loadError")}
          actionLabel={t("ui.backToLibrary")}
          actionHref="/app/biblioteca"
        />
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
