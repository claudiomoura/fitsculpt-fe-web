"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import type { Recipe } from "@/lib/types";

type RecipeDetailClientProps = {
  recipe: Recipe | null;
  error?: string | null;
};

const RECIPE_PLACEHOLDER = "/placeholders/recipe-cover.svg";

export default function RecipeDetailClient({ recipe, error }: RecipeDetailClientProps) {
  const { t } = useLanguage();
  if (error || !recipe) {
    return (
      <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <p className="muted">{error ?? t("recipes.loadError")}</p>
        <Link className="btn" style={{ width: "fit-content", marginTop: 12 }} href="/app/biblioteca/recetas">
          {t("recipes.backToRecipes")}
        </Link>
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
    <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="form-stack">
        <h1 className="section-title" style={{ fontSize: 28 }}>
          {recipe.name}
        </h1>
        <p className="section-subtitle">{t("recipes.detailSubtitle")}</p>
      </div>

      <div className="recipe-media" style={{ marginTop: 16 }}>
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

      <div className="info-grid" style={{ marginTop: 16 }}>
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
        <div className="feature-card" style={{ marginTop: 20 }}>
          <h3>{t("recipes.descriptionTitle")}</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {recipe.description}
          </p>
        </div>
      ) : null}

      {hasIngredients ? (
        <div className="feature-card" style={{ marginTop: 16 }}>
          <h3>{t("recipes.ingredientsTitle")}</h3>
          <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                {ingredient.name} {ingredient.grams ? `· ${ingredient.grams} g` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasSteps ? (
        <div style={{ marginTop: 16 }}>
          <h3>{t("recipes.stepsTitle")}</h3>
          <ol className="steps-list" style={{ marginTop: 12 }}>
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
        <p className="muted" style={{ marginTop: 16 }}>
          {t("recipes.noDetails")}
        </p>
      ) : null}

      <Link className="btn" style={{ width: "fit-content", marginTop: 20 }} href="/app/biblioteca/recetas">
        {t("recipes.backToRecipes")}
      </Link>
    </section>
  );
}
