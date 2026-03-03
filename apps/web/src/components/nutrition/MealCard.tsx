"use client";

import { useLanguage } from "@/context/LanguageProvider";
import { cn } from "@/lib/classNames";
import { Skeleton } from "@/components/ui/Skeleton";
import { RecipeImage } from "@/components/nutrition/RecipeImage";

type MealCardProps = {
  title: string;
  description?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
};

export function MealCard({ title, description, meta, imageUrl, onClick, className, ariaLabel }: MealCardProps) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      className={cn("meal-card", className)}
      onClick={onClick}
      aria-label={ariaLabel ?? title ?? t("nutrition.mealTitleFallback")}
    >
      <div className="meal-card-media" aria-hidden="true">
        <RecipeImage
          src={imageUrl}
          alt={title || t("nutrition.mealTitleFallback")}
          className="meal-card-thumb"
          fallbackClassName="meal-card-thumb meal-card-thumb--placeholder"
          testId="meal-card-image"
        />
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
