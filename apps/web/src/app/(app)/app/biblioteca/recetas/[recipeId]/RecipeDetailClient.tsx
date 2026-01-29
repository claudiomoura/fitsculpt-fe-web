"use client";

import { useLanguage } from "@/context/LanguageProvider";
import type { Recipe } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type RecipeDetailClientProps = {
  recipe: Recipe | null;
  error?: string | null;
};

const RECIPE_PLACEHOLDER = "/placeholders/recipe-cover.svg";

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

  return (
    <section className="card centered-card">
      <div className="page-header">
        <div className="page-header-body">
          <h1 className="section-title">{recipe.name}</h1>
          <p className="section-subtitle">{t("recipes.detailSubtitle")}</p>
        </div>
        <div className="page-header-actions">
          <ButtonLink variant="secondary" href="/app/biblioteca/recetas">
            {t("recipes.backToRecipes")}
          </ButtonLink>
        </div>
      </div>

      <div className="recipe-media mt-16">
        <img
          src={recipe.photoUrl ?? RECIPE_PLACEHOLDER}
          alt={recipe.name}
          className="recipe-detail-media"
          onError={(event) => {
            event.currentTarget.src = RECIPE_PLACEHOLDER;
          }}
        />
        {!hasPhoto ? <p className="muted">{t("recipes.mediaPlaceholder")}</p> : null}
      </div>

      <div className="info-grid mt-16">
        <div className="info-item">
          <p className="info-label">{t("recipes.caloriesLabel")}</p>
          <p className="info-value">{Math.round(recipe.calories)} kcal</p>
        </div>
        <div className="info-item">
          <p className="info-label">{t("recipes.proteinLabel")}</p>
          <p className="info-value">{Math.round(recipe.protein)} g</p>
        </div>
        <div className="info-item">
          <p className="info-label">{t("recipes.carbsLabel")}</p>
          <p className="info-value">{Math.round(recipe.carbs)} g</p>
        </div>
        <div className="info-item">
          <p className="info-label">{t("recipes.fatLabel")}</p>
          <p className="info-value">{Math.round(recipe.fat)} g</p>
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
              <li key={ingredient.id}>
                {ingredient.name} {ingredient.grams ? `· ${ingredient.grams} g` : ""}
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
