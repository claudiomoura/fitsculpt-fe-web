export const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "";

function normalizeBaseUrl(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function buildExerciseMediaUrl(slug: string | null | undefined, extension: "jpg" | "gif") {
  if (!slug) return null;
  const base = normalizeBaseUrl(MEDIA_BASE_URL);
  return `${base}/exercises/${slug}.${extension}`;
}
