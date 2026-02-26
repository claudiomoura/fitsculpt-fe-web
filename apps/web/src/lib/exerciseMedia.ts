import type { Exercise } from "@/lib/types";

const COVER_PLACEHOLDER = "/placeholders/exercise-cover.jpg";
const DEMO_PLACEHOLDER = "/placeholders/exercise-demo.svg";

type DemoMedia = {
  kind: "image" | "video";
  url: string;
  poster?: string;
};

type MediaCandidate = {
  imageUrl?: unknown;
  imageUrls?: unknown;
  image_url?: unknown;
  image_urls?: unknown;
  thumbnailUrl?: unknown;
  thumbnail_url?: unknown;
  mediaUrl?: unknown;
  media_url?: unknown;
  gifUrl?: unknown;
  gif_url?: unknown;
  videoUrl?: unknown;
  video_url?: unknown;
  media?: { url?: unknown; thumbnailUrl?: unknown; thumbnail_url?: unknown };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;

  const lower = normalized.toLowerCase();
  if (["null", "undefined", "nan", "n/a", "none", "false", "true"].includes(lower)) {
    return null;
  }

  return normalizeExerciseMediaUrl(normalized);
}

export function normalizeExerciseMediaUrl(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (/^(https?:\/\/|\/\/|data:|blob:)/i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  if (normalized.startsWith("./")) {
    return `/${normalized.slice(2)}`;
  }

  if (normalized.startsWith("../")) {
    return null;
  }

  return `/${normalized}`;
}

function firstUrlFromList(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const entry of value) {
    const text = asText(entry);
    if (text) {
      return text;
    }
  }

  return null;
}

export function getExerciseThumbUrl(exercise: unknown): string | null {
  if (!exercise || typeof exercise !== "object") return null;
  const e = exercise as MediaCandidate;

  const urls = [
    e.imageUrl,
    firstUrlFromList(e.imageUrls),
    e.image_url,
    firstUrlFromList(e.image_urls),
    e.thumbnailUrl,
    e.thumbnail_url,
    e.mediaUrl,
    e.media_url,
    e.gifUrl,
    e.gif_url,
    e.videoUrl,
    e.video_url,
    e.media?.thumbnailUrl,
    e.media?.thumbnail_url,
    e.media?.url,
  ];

  for (const candidate of urls) {
    const match = asText(candidate);
    if (match) return match;
  }

  return null;
}

function resolveExerciseThumbnail(exercise?: Exercise | null): string | null {
  if (!exercise) return null;
  const rawExercise = exercise as Exercise & Record<string, unknown>;
  const media = asRecord(rawExercise.media);

  return (
    asText(exercise.posterUrl) ??
    getExerciseThumbUrl(exercise) ??
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
