import type { Exercise } from "@/lib/types";

const COVER_PLACEHOLDER = "/placeholders/exercise-cover.jpg";
const DEMO_PLACEHOLDER = "/placeholders/exercise-demo.svg";

type DemoMedia = {
  kind: "image" | "video";
  url: string;
  poster?: string;
};

export function getExerciseCoverUrl(exercise?: Exercise | null): string {
  if (!exercise) return COVER_PLACEHOLDER;
  return exercise.posterUrl ?? exercise.imageUrl ?? COVER_PLACEHOLDER;
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
      poster: exercise.posterUrl ?? exercise.imageUrl ?? COVER_PLACEHOLDER,
    };
  }

  return { kind: "image", url: DEMO_PLACEHOLDER };
}
