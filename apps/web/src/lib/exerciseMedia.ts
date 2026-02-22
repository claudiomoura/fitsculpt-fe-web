import type { Exercise } from "@/lib/types";

const COVER_PLACEHOLDER = "/placeholders/exercise-cover.jpg";
const DEMO_PLACEHOLDER = "/placeholders/exercise-demo.svg";

type DemoMedia = {
  kind: "image" | "video";
  url: string;
  poster?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveExerciseThumbnail(exercise?: Exercise | null): string | null {
  if (!exercise) return null;
  const rawExercise = exercise as Exercise & Record<string, unknown>;
  const media = asRecord(rawExercise.media);

  return (
    asText(exercise.posterUrl) ??
    asText(exercise.imageUrl) ??
    asText(rawExercise.thumbnailUrl) ??
    asText(rawExercise.mediaUrl) ??
    asText(media?.thumbnailUrl) ??
    null
  );
}

export function getExerciseCoverUrl(exercise?: Exercise | null): string {
  return resolveExerciseThumbnail(exercise) ?? COVER_PLACEHOLDER;
}

export function getExerciseDemoUrl(exercise?: Exercise | null): DemoMedia {
  if (!exercise) {
    return { kind: "image", url: DEMO_PLACEHOLDER };
  }

  const videoUrl = exercise.mediaUrl ?? exercise.videoUrl;
  if (videoUrl) {
    return {
      kind: "video",
      url: videoUrl,
      poster: resolveExerciseThumbnail(exercise) ?? COVER_PLACEHOLDER,
    };
  }

  return { kind: "image", url: DEMO_PLACEHOLDER };
}
