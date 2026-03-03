"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/classNames";

type RecipeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackIconClassName?: string;
  testId?: string;
};

function normalizeImageUrl(src?: string | null): string | null {
  if (typeof src !== "string") return null;
  const trimmed = src.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function RecipeImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackIconClassName,
  testId,
}: RecipeImageProps) {
  const normalizedSrc = useMemo(() => normalizeImageUrl(src), [src]);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || hasLoadError) {
    return (
      <div
        className={cn("recipe-image-fallback", className, fallbackClassName)}
        aria-label={alt}
        role="img"
        data-testid={testId ? `${testId}-fallback` : undefined}
      >
        <span className={cn("recipe-image-fallback__icon", fallbackIconClassName)} aria-hidden="true">🍽️</span>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasLoadError(true)}
      data-testid={testId}
    />
  );
}
