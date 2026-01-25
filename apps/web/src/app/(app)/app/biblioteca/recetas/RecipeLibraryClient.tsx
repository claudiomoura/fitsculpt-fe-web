"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Recipe } from "@/lib/types";

type RecipeResponse = {
  items: Recipe[];
};

const RECIPE_PLACEHOLDER = "/placeholders/recipe-cover.svg";

export default function RecipeLibraryClient() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        params.set("limit", "100");
        const response = await fetch(`/api/recipes?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t("recipes.loadErrorList"));
          setRecipes([]);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as RecipeResponse;
        setRecipes(data.items ?? []);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("recipes.loadErrorList"));
        setRecipes([]);
        setLoading(false);
      }
    };

    void loadRecipes();
    return () => controller.abort();
  }, [query, t]);

  return (
    <section className="card">
      <div className="form-stack">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("recipes.searchPlaceholder")}
        />
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {t("recipes.loading")}
        </p>
      ) : error ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {error}
        </p>
      ) : recipes.length === 0 ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {t("recipes.empty")}
        </p>
      ) : (
        <div className="list-grid" style={{ marginTop: 16 }}>
          {recipes.map((recipe) => {
            const ingredients = recipe.ingredients ?? [];
            const photoUrl = recipe.photoUrl ?? RECIPE_PLACEHOLDER;
            return (
              <Link
                key={recipe.id}
                href={`/app/biblioteca/recetas/${recipe.id}`}
                className="feature-card recipe-card"
                style={{ textDecoration: "none" }}
              >
                <img
                  src={photoUrl}
                  alt={recipe.name}
                  className="recipe-card-media"
                  onError={(event) => {
                    event.currentTarget.src = RECIPE_PLACEHOLDER;
                  }}
                />
                <h3>{recipe.name}</h3>
                {recipe.description ? <p className="muted">{recipe.description}</p> : null}
                <div className="badge-list">
                  <span className="badge">{Math.round(recipe.calories)} kcal</span>
                  <span className="badge">P {Math.round(recipe.protein)}</span>
                  <span className="badge">C {Math.round(recipe.carbs)}</span>
                  <span className="badge">G {Math.round(recipe.fat)}</span>
                </div>
                {ingredients.length > 0 ? (
                  <p className="muted">
                    {t("recipes.ingredientsLabel")}: {ingredients.slice(0, 3).map((item) => item.name).join(", ")}
                    {ingredients.length > 3 ? "..." : ""}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
