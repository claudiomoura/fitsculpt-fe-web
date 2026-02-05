"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { cn } from "@/lib/classNames";
import { Skeleton } from "@/components/ui/Skeleton";

type MealCardProps = {
  title: string;
  description?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  onClick?: () => void;
  className?: string;
};

export function MealCard({ title, description, meta, imageUrl, onClick, className }: MealCardProps) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(imageUrl && imageUrl.trim().length > 0) && !imageError;

  return (
    <button type="button" className={cn("meal-card", className)} onClick={onClick}>
      <div className="meal-card-media" aria-hidden="true">
        {showImage ? (
          <img
            src={imageUrl ?? ""}
            alt={title || t("nutrition.mealTitleFallback")}
            className="meal-card-thumb"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="meal-card-thumb meal-card-thumb--placeholder" />
        )}
      </div>
      <div className="meal-card-body">
        <strong className="meal-card-title">{title}</strong>
        {description ? <p className="meal-card-description">{description}</p> : null}
        {meta ? <p className="meal-card-meta">{meta}</p> : null}
      </div>
    </button>
  );
}

export function MealCardSkeleton() {
  return (
    <div className="meal-card meal-card--skeleton" aria-hidden="true">
      <Skeleton className="meal-card-thumb" />
      <div className="meal-card-body">
        <Skeleton variant="line" style={{ width: "65%" }} />
        <Skeleton variant="line" style={{ width: "85%" }} />
      </div>
    </div>
  );
}
