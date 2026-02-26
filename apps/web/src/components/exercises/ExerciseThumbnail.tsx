"use client";

import Image from "next/image";
import { normalizeExerciseMediaUrl } from "@/lib/exerciseMedia";

type ExerciseThumbnailProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

const PLACEHOLDER_SRC = "/placeholders/exercise-cover.jpg";

export function ExerciseThumbnail({ src, alt, width, height, className }: ExerciseThumbnailProps) {
  const normalized = src ? normalizeExerciseMediaUrl(src) : null;
  const displaySrc = normalized ?? PLACEHOLDER_SRC;

  return (
    <Image
      className={className}
      src={displaySrc}
      alt={alt}
      width={width}
      height={height}
      onError={(event) => {
        event.currentTarget.src = PLACEHOLDER_SRC;
      }}
    />
  );
}
