"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Recipe } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { role?: "ADMIN" | "USER" };
        setIsAdmin(data.role === "ADMIN");
      } catch {
      }
    };
    void loadRole();
    return () => controller.abort();
  }, []);

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
  }, [query, retryKey, t]);

  return (
    <section className="card">
      <div className="library-search">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("recipes.searchPlaceholder")}
          label={t("recipes.searchLabel")}
          helperText={t("recipes.searchHelper")}
        />
        <div className="library-filter-actions">
          <Badge variant="muted">{t("recipes.filtersActive")}</Badge>
          {query.trim().length > 0 ? <Badge>{t("recipes.filterQueryLabel")} {query.trim()}</Badge> : null}
        </div>
      </div>

      {loading ? (
        <div className="list-grid mt-16">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : error ? (
        <div className="empty-state mt-16">
          <div className="empty-state-icon">
            <Icon name="warning" />
          </div>
          <div>
            <h3 className="m-0">{t("recipes.errorTitle")}</h3>
            <p className="muted">{error}</p>
          </div>
          <Button variant="secondary" onClick={() => setRetryKey((prev) => prev + 1)}>
            {t("ui.retry")}
          </Button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state mt-16">
          <div className="empty-state-icon">
            <Icon name="info" />
          </div>
          <div>
            <h3 className="m-0">{t("recipes.emptyTitle")}</h3>
            <p className="muted">{t("recipes.empty")}</p>
          </div>
          <div className="empty-state-actions">
            {isAdmin ? (
              <Link className="btn secondary" href="/app/nutricion">
                {t("recipes.emptyAdminCta")}
              </Link>
            ) : null}
            <Button onClick={() => setRetryKey((prev) => prev + 1)}>
              {t("recipes.retrySearch")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="list-grid mt-16">
          {recipes.map((recipe) => {
            const ingredients = recipe.ingredients ?? [];
            const photoUrl = recipe.photoUrl ?? RECIPE_PLACEHOLDER;
            return (
              <Link
                key={recipe.id}
                href={`/app/biblioteca/recetas/${recipe.id}`}
                className="feature-card recipe-card library-card"
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
