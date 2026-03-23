const COVER_PLACEHOLDER = "/placeholders/recipe-cover.svg";

type RecipeMediaCandidate = {
  imageUrl?: unknown;
  photoUrl?: unknown;
  imageUrls?: unknown;
  image_url?: unknown;
  image_urls?: unknown;
  thumbnailUrl?: unknown;
  thumbnail_url?: unknown;
  mediaUrl?: unknown;
  media_url?: unknown;
  media?: { url?: unknown; thumbnailUrl?: unknown; thumbnail_url?: unknown };
};

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;

  const lower = normalized.toLowerCase();
  if (["null", "undefined", "nan", "n/a", "none", "false", "true"].includes(lower)) {
    return null;
  }

  return normalizeRecipeMediaUrl(normalized);
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

export function normalizeRecipeMediaUrl(value: string): string | null {
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

export function getRecipeThumbUrl(recipe: unknown): string | null {
  if (!recipe || typeof recipe !== "object") return null;
  const r = recipe as RecipeMediaCandidate;

  const urls = [
    r.imageUrl,
    r.photoUrl,
    firstUrlFromList(r.imageUrls),
    r.image_url,
    firstUrlFromList(r.image_urls),
    r.thumbnailUrl,
    r.thumbnail_url,
    r.mediaUrl,
    r.media_url,
    r.media?.thumbnailUrl,
    r.media?.thumbnail_url,
    r.media?.url,
  ];

  for (const candidate of urls) {
    const match = asText(candidate);
    if (match) return match;
  }

  return null;
}

export function getRecipeCoverUrl(recipe?: unknown): string {
  return getRecipeThumbUrl(recipe) ?? COVER_PLACEHOLDER;
}
