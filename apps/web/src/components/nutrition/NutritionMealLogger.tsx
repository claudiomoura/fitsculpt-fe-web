"use client";

import Link from "next/link";
import { Button } from "@/design-system/components/Button";
import { Icon } from "@/design-system/components/Icon";
import { Modal } from "@/design-system/components/Modal";
import { MealCard } from "@/components/nutrition/MealCard";
import { RecipeImage } from "@/components/nutrition/RecipeImage";
import type { NutritionMeal } from "@/lib/profile";

type MealMediaCandidate = {
  recipeId?: unknown;
  imageUrl?: unknown;
  thumbnailUrl?: unknown;
  mediaUrl?: unknown;
  instructions?: unknown;
  media?: {
    url?: unknown;
    thumbnailUrl?: unknown;
  };
};

const RECIPE_PLACEHOLDER = "/placeholders/recipe-cover.jpg";

function getMealMediaUrl(
  meal: NutritionMeal,
  recipeCatalog: Record<string, { photoUrl?: string | null }> = {},
) {
  const candidate = meal as MealMediaCandidate;
  const directUrl =
    candidate.imageUrl ??
    candidate.thumbnailUrl ??
    candidate.mediaUrl ??
    candidate.media?.thumbnailUrl ??
    candidate.media?.url;
  if (typeof directUrl === "string" && directUrl.trim().length > 0) {
    return directUrl;
  }

  const recipeId = candidate.recipeId;
  if (typeof recipeId === "string" && recipeId.trim().length > 0) {
    const recipe = recipeCatalog[recipeId];
    if (recipe?.photoUrl) {
      return recipe.photoUrl;
    }
  }

  const mealTitle = meal.title?.toLowerCase().trim() ?? "";
  const normalizedTitle = mealTitle.replace(/^\d+\.\s*/, "");
  const recipe = recipeCatalog[normalizedTitle];
  if (recipe?.photoUrl) {
    return recipe.photoUrl;
  }

  const isLikelyId = (key: string) => key.includes("_") || key.includes("-") || key.length > 30;
  
  for (const [name, recipeData] of Object.entries(recipeCatalog)) {
    if (isLikelyId(name)) continue;
    const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
    const nameWords = name.split(/\s+/).filter(w => w.length > 2);
    const hasMatch = titleWords.some(tw => 
      name.includes(tw) || nameWords.some(nw => tw.includes(nw) || nw.includes(tw))
    );
    if (hasMatch && recipeData.photoUrl) {
      return recipeData.photoUrl;
    }
  }

  for (const [name, recipeData] of Object.entries(recipeCatalog)) {
    if (isLikelyId(name)) continue;
    if (normalizedTitle.includes(name) || name.includes(normalizedTitle)) {
      if (recipeData.photoUrl) {
        return recipeData.photoUrl;
      }
    }
  }

  return RECIPE_PLACEHOLDER;
}

function getMealInstructions(meal: NutritionMeal) {
  const candidate = meal as MealMediaCandidate;
  if (typeof candidate.instructions !== "string") return null;
  const instructions = candidate.instructions.trim();
  return instructions.length > 0 ? instructions : null;
}

function getMealTitle(meal: NutritionMeal, t: (key: string) => string) {
  const title = meal.title?.trim();
  return title && title.length > 0 ? title : t("nutrition.mealTitleFallback");
}

function getMealDescription(meal: NutritionMeal) {
  const description = meal.description?.trim();
  return description && description.length > 0 ? description : null;
}

function getMealTypeLabel(meal: NutritionMeal, t: (key: string) => string) {
  switch (meal.type) {
    case "breakfast":
      return t("nutrition.mealTypeBreakfast");
    case "lunch":
      return t("nutrition.mealTypeLunch");
    case "dinner":
      return t("nutrition.mealTypeDinner");
    case "snack":
      return t("nutrition.mealTypeSnack");
    default:
      return t("nutrition.mealTypeFallback");
  }
}

type NutritionMealLoggerProps = {
  selectedMeal: {
    meal: NutritionMeal;
    dayKey: string;
    mealKey: string;
    dayLabel?: string | null;
  } | null;
  selectedRecipeDetail: {
    photoUrl?: string | null;
    description?: string | null;
    steps?: string[] | null;
    ingredients?: Array<{ id?: string; name: string; grams?: number }> | null;
  } | null;
  recipeCatalog: Record<string, { photoUrl?: string | null }>;
  adherenceError: string | null;
  isConsumedDay: (mealKey: string, dayKey: string) => boolean;
  quickLogMessage: { type: "success" | "error"; message: string } | null;
  onQuickLogMessageChange: (msg: { type: "success" | "error"; message: string } | null) => void;
  onCloseMealDetail: () => void;
  onQuickLogMeal: (
    mealKey: string,
    meal: NutritionMeal,
    dayKey?: string | null,
  ) => Promise<void>;
  onFavoriteAction: (meal: NutritionMeal) => void;
  isSelectedMealFavorite: boolean;
  t: (key: string) => string;
  safeT: (key: string, fallback?: string) => string;
};

export function NutritionMealLogger({
  selectedMeal,
  selectedRecipeDetail,
  recipeCatalog,
  adherenceError,
  isConsumedDay,
  quickLogMessage,
  onQuickLogMessageChange,
  onCloseMealDetail,
  onQuickLogMeal,
  onFavoriteAction,
  isSelectedMealFavorite,
  t,
  safeT,
}: NutritionMealLoggerProps) {
  const selectedMealDetails = selectedMeal?.meal ?? null;
  const selectedMealTitle = selectedMealDetails
    ? getMealTitle(selectedMealDetails, t)
    : "";
  const selectedMealDescription = selectedMealDetails
    ? getMealDescription(selectedMealDetails)
    : null;
  const selectedMealInstructions = selectedMealDetails
    ? getMealInstructions(selectedMealDetails)
    : null;
  const selectedMealIngredients =
    selectedMealDetails?.ingredients?.filter(
      (ingredient) => ingredient.name.trim().length > 0,
    ) ?? [];

  return (
    <Modal
      open={Boolean(selectedMeal)}
      title={t("nutrition.mealDetailTitle")}
      description={selectedMeal?.dayLabel ?? undefined}
      onClose={onCloseMealDetail}
      footer={
        <div className="inline-actions-sm">
          <Button variant="secondary" onClick={onCloseMealDetail}>
            {t("ui.close")}
          </Button>
          {selectedMeal ? (
            <Button
              onClick={() =>
                void onQuickLogMeal(
                  selectedMeal.mealKey,
                  selectedMeal.meal,
                  selectedMeal.dayKey,
                )
              }
              disabled={!!adherenceError}
            >
              {isConsumedDay(selectedMeal.mealKey, selectedMeal.dayKey)
                ? t("nutrition.quickLogButtonConsumed")
                : t("nutrition.quickLogButton")}
            </Button>
          ) : null}
        </div>
      }
    >
      {selectedMealDetails ? (
        <div className="stack-md">
          <div>
            <h3 className="m-0">{selectedMealTitle}</h3>
            <p className="muted mt-4">
              {getMealTypeLabel(selectedMealDetails, t)}
            </p>
            <div className="inline-actions-sm mt-8">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onFavoriteAction(selectedMealDetails)}
              >
                {isSelectedMealFavorite
                  ? t("nutrition.quickRemoveFavorite")
                  : t("nutrition.quickAddFavorite")}
              </Button>
              {selectedMealDetails.recipeId ? (
                <Link
                  href={`/app/biblioteca/recetas/${selectedMealDetails.recipeId}`}
                  className="btn secondary fit-content"
                >
                  <Icon name="link" size={16} />
                  <span>{safeT("nutrition.viewFullRecipe", "Ver receta")}</span>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="recipe-media mt-16">
            <RecipeImage
              src={selectedRecipeDetail?.photoUrl ?? getMealMediaUrl(selectedMealDetails, recipeCatalog)}
              alt={selectedMealTitle}
              width={600}
              height={400}
              className="recipe-detail-media"
            />
          </div>

          <div className="info-grid mt-16">
            <div className="info-item">
              <p className="info-label">{t("recipes.caloriesLabel")}</p>
              <p className="info-value">
                {Math.round(selectedMealDetails.macros?.calories ?? 0)} {t("recipes.caloriesUnit")}
              </p>
            </div>
            <div className="info-item">
              <p className="info-label">{t("recipes.proteinLabel")}</p>
              <p className="info-value">
                {Math.round(selectedMealDetails.macros?.protein ?? 0)} {t("recipes.gramsUnit")}
              </p>
            </div>
            <div className="info-item">
              <p className="info-label">{t("recipes.carbsLabel")}</p>
              <p className="info-value">
                {Math.round(selectedMealDetails.macros?.carbs ?? 0)} {t("recipes.gramsUnit")}
              </p>
            </div>
            <div className="info-item">
              <p className="info-label">{t("recipes.fatLabel")}</p>
              <p className="info-value">
                {Math.round(selectedMealDetails.macros?.fats ?? 0)} {t("recipes.gramsUnit")}
              </p>
            </div>
          </div>

          {(selectedRecipeDetail?.description ?? selectedMealDescription) ? (
            <div className="feature-card mt-20">
              <h3>{t("recipes.descriptionTitle")}</h3>
              <p className="muted mt-8">
                {selectedRecipeDetail?.description ?? selectedMealDescription}
              </p>
            </div>
          ) : null}

          {(selectedRecipeDetail?.ingredients?.length ?? selectedMealIngredients.length) > 0 ? (
            <div className="feature-card mt-16">
              <h3>{t("recipes.ingredientsTitle")}</h3>
              <ul className="muted list-muted">
                {(selectedRecipeDetail?.ingredients ?? selectedMealIngredients).map((ingredient, index) => (
                  <li key={ingredient.id ?? `${ingredient.name}-${index}`}>
                    {ingredient.name}{" "}
                    {ingredient.grams ? `· ${ingredient.grams} ${t("recipes.gramsUnit")}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {selectedRecipeDetail?.steps?.length ? (
            <div className="mt-16">
              <h3>{t("recipes.stepsTitle")}</h3>
              <ol className="steps-list recipe-steps">
                {selectedRecipeDetail.steps.map((step, index) => (
                  <li key={`${step}-${index}`} className="steps-item">
                    <div className="steps-index">{index + 1}</div>
                    <div>
                      <h3>{t("recipes.stepLabel")} {index + 1}</h3>
                      <p className="muted">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state">
          <p className="muted">{t("nutrition.mealDetailsNotFound")}</p>
        </div>
      )}
    </Modal>
  );
}
