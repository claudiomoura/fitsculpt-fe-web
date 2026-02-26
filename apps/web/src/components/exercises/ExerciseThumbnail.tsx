"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeExerciseMediaUrl } from "@/lib/exerciseMedia";

type ExerciseThumbnailProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

const PLACEHOLDER_SRC = "/placeholders/exercise-cover.jpg";

export function ExerciseThumbnail({
  src,
  alt,
  width,
  height,
  className,
}: ExerciseThumbnailProps) {
  const normalized = useMemo(
    () => (src ? normalizeExerciseMediaUrl(src) : null),
    [src],
  );
  const [hasLoadError, setHasLoadError] = useState(false);
  const displaySrc = hasLoadError
    ? PLACEHOLDER_SRC
    : (normalized ?? PLACEHOLDER_SRC);

  useEffect(() => {
    setHasLoadError(false);
  }, [normalized]);

  return (
    <img
      className={className}
      src={displaySrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!hasLoadError) {
          setHasLoadError(true);
        }
      }}
    />
  );
}
