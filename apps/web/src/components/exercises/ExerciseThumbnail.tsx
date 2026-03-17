"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { normalizeExerciseMediaUrl } from "@/lib/exerciseMedia";

type ExerciseThumbnailProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

const PLACEHOLDER_SRC = "/placeholders/exercise-cover.svg";

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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const effectiveSrc = normalized ?? PLACEHOLDER_SRC;
  const hasLoadError = failedSrc === effectiveSrc;
  const displaySrc = hasLoadError
    ? PLACEHOLDER_SRC
    : effectiveSrc;

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
