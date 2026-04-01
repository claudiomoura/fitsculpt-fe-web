"use client";

import { useLanguage } from "@/context/LanguageProvider";
import type { Recipe } from "@/lib/types";
import { ButtonLink } from "@/design-system/components/Button";
import { Icon } from "@/design-system/components/Icon";
import { RecipeImage } from "@/components/nutrition/RecipeImage";

type RecipeDetailClientProps = {
  recipe: Recipe | null;
  error?: string | null;
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
  "pre-workout": "Pre-entreno",
  "post-workout": "Post-entreno",
};

const DIET_TYPE_LABELS: Record<string, string> = {
  balanced: "Equilibrada",
  "high-protein": "Alta en proteína",
  "low-carb": "Baja en carbos",
  keto: "Keto",
  "calorie-deficit": "Déficit calórico",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
};

const CUISINE_LABELS: Record<string, string> = {
  mediterranean: "Mediterránea",
  asian: "Asiática",
  mexican: "Mexicana",
  american: "Americana",
  spanish: "Española",
  italian: "Italiana",
  indian: "India",
};

const GOAL_FIT_LABELS: Record<string, string> = {
  "muscle-gain": "Ganancia muscular",
  "weight-loss": "Pérdida de peso",
  maintenance: "Mantenimiento",
  "athletic-performance": "Rendimiento atlético",
  "healthy-lifestyle": "Vida saludable",
};

const INGREDIENT_CATEGORY_LABELS: Record<string, string> = {
  protein: "proteína",
  carb: "carb",
  vegetable: "verdura",
  fat: "grasa",
  sauce: "salsa",
  seasoning: "condimento",
};

export default function RecipeDetailClient({ recipe, error }: RecipeDetailClientProps) {
  const { t } = useLanguage();
  if (error || !recipe) {
    return (
      <section className="card centered-card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Icon name="warning" />
          </div>
          <div>
            <h3 className="m-0">{t("recipes.errorTitle")}</h3>
            <p className="muted">{error ?? t("recipes.loadError")}</p>
          </div>
          <ButtonLink href="/app/biblioteca/recetas" className="fit-content">
            {t("recipes.backToRecipes")}
          </ButtonLink>
        </div>
      </section>
    );
  }

  const hasPhoto = Boolean(recipe.photoUrl);
  const hasDescription = Boolean(recipe.description);
  const ingredients = recipe.ingredients ?? [];
  const hasIngredients = ingredients.length > 0;
  const steps = recipe.steps ?? [];
  const hasSteps = steps.length > 0;
  const hasDetails = hasDescription || hasIngredients || hasSteps;

  const mealTypeLabel = recipe.mealType ? MEAL_TYPE_LABELS[recipe.mealType] : null;
  const dietTypeLabel = recipe.dietType ? DIET_TYPE_LABELS[recipe.dietType] : null;
  const difficultyLabel = recipe.difficulty ? DIFFICULTY_LABELS[recipe.difficulty] : null;
  const cuisineLabel = recipe.cuisine ? CUISINE_LABELS[recipe.cuisine] : null;
  const goalFitLabel = recipe.goalFit ? GOAL_FIT_LABELS[recipe.goalFit] : null;

  return (
    <section className="card centered-card">
      <div className="page-header">
        <div className="page-header-body">
          <h1 className="section-title">{recipe.displayName || recipe.name}</h1>
          {recipe.tagline ? <p className="section-tagline">{recipe.tagline}</p> : null}
          <p className="section-subtitle">{t("recipes.detailSubtitle")}</p>
        </div>
        <div className="page-header-actions">
          <ButtonLink variant="secondary" href="/app/biblioteca/recetas">
            {t("recipes.backToRecipes")}
          </ButtonLink>
        </div>
      </div>

      {/* New badges row */}
      <div className="recipe-badges mt-4">
        {mealTypeLabel && <span className="recipe-badge badge-meal-type">{mealTypeLabel}</span>}
        {difficultyLabel && <span className="recipe-badge badge-difficulty">{difficultyLabel}</span>}
        {cuisineLabel && <span className="recipe-badge badge-cuisine">{cuisineLabel}</span>}
        {dietTypeLabel && <span className="recipe-badge badge-diet-type">{dietTypeLabel}</span>}
        {goalFitLabel && <span className="recipe-badge badge-goal-fit">{goalFitLabel}</span>}
      </div>

      {/* Time info */}
      {(recipe.prepTimeMinutes || recipe.cookTimeMinutes) && (
        <div className="recipe-times mt-4">
          {recipe.prepTimeMinutes && (
            <span className="time-item">
              Prep: {recipe.prepTimeMinutes} min
            </span>
          )}
          {recipe.cookTimeMinutes && (
            <span className="time-item">
              Cocina: {recipe.cookTimeMinutes} min
            </span>
          )}
        </div>
      )}

      <div className="recipe-media mt-16">
        <RecipeImage
          src={recipe.photoUrl}
          alt={recipe.name}
          width={600}
          height={400}
          className="recipe-detail-media"
        />
        {!hasPhoto ? <p className="muted">{t("recipes.mediaPlaceholder")}</p> : null}
      </div>

      <div className="info-grid mt-16">
        <div className="info-item">
          <p className="info-label">{t("recipes.caloriesLabel")}</p>
          <p className="info-value">
            {Math.round(recipe.calories)} {t("recipes.caloriesUnit")}
          </p>
        </div>
        <div className="info-item">
          <p className="info-label">{t("recipes.proteinLabel")}</p>
          <p className="info-value">
            {Math.round(recipe.protein)} {t("recipes.gramsUnit")}
          </p>
        </div>
        <div className="info-item">
          <p className="info-label">{t("recipes.carbsLabel")}</p>
          <p className="info-value">
            {Math.round(recipe.carbs)} {t("recipes.gramsUnit")}
          </p>
        </div>
        <div className="info-item">
          <p className="info-label">{t("recipes.fatLabel")}</p>
          <p className="info-value">
            {Math.round(recipe.fat)} {t("recipes.gramsUnit")}
          </p>
        </div>
      </div>

      {hasDescription ? (
        <div className="feature-card mt-20">
          <h3>{t("recipes.descriptionTitle")}</h3>
          <p className="muted mt-8">
            {recipe.description}
          </p>
        </div>
      ) : null}

      {hasIngredients ? (
        <div className="feature-card mt-16">
          <h3>{t("recipes.ingredientsTitle")}</h3>
          <ul className="muted list-muted">
            {ingredients.map((ingredient) => (
              <li key={ingredient.id} className={ingredient.isMainIngredient ? "ingredient-main" : ""}>
                {ingredient.isMainIngredient && <span className="main-ingredient-badge">Principal</span>}
                {ingredient.name}
                {ingredient.category && (
                  <span className="ingredient-category">{INGREDIENT_CATEGORY_LABELS[ingredient.category]}</span>
                )}
                {ingredient.grams ? ` · ${ingredient.grams} ${t("recipes.gramsUnit")}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasSteps ? (
        <div className="mt-16">
          <h3>{t("recipes.stepsTitle")}</h3>
          <ol className="steps-list recipe-steps">
            {steps.map((step, index) => (
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

      {!hasDetails ? (
        <p className="muted mt-16">
          {t("recipes.noDetails")}
        </p>
      ) : null}
    </section>
  );
}
