"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { normalizeRecipeMediaUrl } from "@/lib/recipeMedia";

type RecipeImageProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

const PLACEHOLDER_SRC = "/placeholders/recipe-cover.jpg";

export function RecipeImage({
  src,
  alt,
  width,
  height,
  className,
}: RecipeImageProps) {
  const normalized = useMemo(
    () => (src ? normalizeRecipeMediaUrl(src) : null),
    [src],
  );
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const effectiveSrc = normalized ?? PLACEHOLDER_SRC;
  const hasLoadError = failedSrc === effectiveSrc;
  const displaySrc = hasLoadError ? PLACEHOLDER_SRC : effectiveSrc;

  return (
    <Image
      className={className}
      src={displaySrc}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      loading="lazy"
      onError={() => {
        if (!hasLoadError) {
          setFailedSrc(effectiveSrc);
        }
      }}
    />
  );
}
