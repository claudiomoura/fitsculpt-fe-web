"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Recipe } from "@/lib/types";
import { Badge } from "@/design-system/components/Badge";
import { Input } from "@/design-system/components/Input";
import { SkeletonCard } from "@/design-system/components/Skeleton";
import { RecipeImage } from "@/components/nutrition/RecipeImage";
import { EmptyState, ErrorState } from "@/components/states";

type SearchMode = "name" | "ingredient";

type RecipeResponse = {
  items: Recipe[];
  total: number;
};

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return debounced;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "breakfast", label: "Desayuno" },
  { value: "snack", label: "Snack" },
  { value: "fish", label: "Pescado" },
  { value: "seafood", label: "Marisco" },
  { value: "poultry", label: "Pollo/Pavo" },
  { value: "beef", label: "Ternera" },
  { value: "vegetarian", label: "Vegetariano" },
  { value: "salad", label: "Ensalada" },
  { value: "soup", label: "Sopa/Crema" },
  { value: "pasta", label: "Pasta" },
  { value: "rice", label: "Arroz/Bowl" },
  { value: "wrap", label: "Wrap/Taco" },
];

export default function RecipeLibraryClient() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [category, setCategory] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    const controller = new AbortController();
    const loadRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { role?: "ADMIN" | "USER" };
        setIsAdmin(data.role === "ADMIN");
      } catch (_err) {
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

        if (debouncedQuery.trim()) {
          if (searchMode === "ingredient") {
            params.set("ingredient", debouncedQuery.trim());
          } else {
            params.set("query", debouncedQuery.trim());
          }
        }

        if (category) {
          params.set("category", category);
        }

        params.set("limit", "100");

        const response = await fetch(`/api/recipes?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t("recipes.loadErrorList"));
          setRecipes([]);
          setTotal(0);
          setLoading(false);
          return;
        }
        const data = (await response.json()) as RecipeResponse;
        setRecipes(data.items ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("recipes.loadErrorList"));
        setRecipes([]);
        setTotal(0);
        setLoading(false);
      }
    };

    void loadRecipes();
    return () => controller.abort();
  }, [debouncedQuery, searchMode, category, retryKey, t]);

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (debouncedQuery.trim()) {
      filters.push(searchMode === "ingredient" ? `Ingrediente: ${debouncedQuery.trim()}` : `Nombre: ${debouncedQuery.trim()}`);
    }
    if (category) {
      const cat = CATEGORY_OPTIONS.find((c) => c.value === category);
      filters.push(`Categoría: ${cat?.label ?? category}`);
    }
    return filters;
  }, [debouncedQuery, searchMode, category]);

  return (
    <section className="card">
      <div className="library-search">
        {/* Search mode toggle */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setSearchMode("name")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              searchMode === "name"
                ? "bg-primary text-on-primary"
                : "bg-surface-alt text-text-muted hover:text-text"
            }`}
          >
            Buscar por nombre
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("ingredient")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              searchMode === "ingredient"
                ? "bg-primary text-on-primary"
                : "bg-surface-alt text-text-muted hover:text-text"
            }`}
          >
            Buscar por ingrediente
          </button>
        </div>

        {/* Search input */}
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            searchMode === "ingredient"
              ? "Ej: pollo, arroz, salmón, brócoli..."
              : t("recipes.searchPlaceholder")
          }
          label={searchMode === "ingredient" ? "Ingrediente" : t("recipes.searchLabel")}
          helperText={
            searchMode === "ingredient"
              ? "Buscá recetas que contengan un ingrediente específico"
              : t("recipes.searchHelper")
          }
        />

        {/* Category filter */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-text-muted mb-1.5">Categoría</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === opt.value
                    ? "bg-primary text-on-primary"
                    : "bg-surface-alt text-text-muted hover:text-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters badges */}
        <div className="library-filter-actions mt-3">
          <Badge variant="muted">
            {recipes.length} de {total} recetas
          </Badge>
          {activeFilters.map((filter) => (
            <Badge key={filter}>{filter}</Badge>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="list-grid mt-16" role="status" aria-live="polite" aria-label={t("recipes.loading")}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          className="mt-16"
          title={t("recipes.loadErrorStateTitle")}
          description={error}
          retryLabel={t("ui.retry")}
          onRetry={() => setRetryKey((prev) => prev + 1)}
          ariaLabel={t("recipes.loadErrorStateTitle")}
        />
      ) : recipes.length === 0 ? (
        <EmptyState
          className="mt-16"
          title={t("recipes.emptyTitle")}
          description={
            searchMode === "ingredient"
              ? `No se encontraron recetas con "${debouncedQuery}"`
              : t("recipes.empty")
          }
          ariaLabel={t("recipes.emptyTitle")}
          actions={[
            ...(isAdmin ? [{ label: t("recipes.emptyAdminCta"), href: "/app/nutricion", variant: "secondary" as const }] : []),
            { label: t("recipes.retrySearch"), onClick: () => setRetryKey((prev) => prev + 1) },
          ]}
        />
      ) : (
        <div className="list-grid mt-16">
          {recipes.map((recipe) => {
            const ingredients = recipe.ingredients ?? [];
            const photoUrl = recipe.photoUrl;
            return (
              <Link
                key={recipe.id}
                href={`/app/biblioteca/recetas/${recipe.id}`}
                className="feature-card recipe-card library-card"
              >
                <RecipeImage
                  src={photoUrl}
                  alt={recipe.name}
                  width={320}
                  height={160}
                  className="recipe-card-media"
                />
                <h3>{recipe.name}</h3>
                {recipe.description ? <p className="muted">{recipe.description}</p> : null}
                <div className="badge-list">
                  <span className="badge">
                    {Math.round(recipe.calories)} {t("recipes.caloriesUnit")}
                  </span>
                  <span className="badge">
                    {t("recipes.macroProteinShort")} {Math.round(recipe.protein)}
                  </span>
                  <span className="badge">
                    {t("recipes.macroCarbsShort")} {Math.round(recipe.carbs)}
                  </span>
                  <span className="badge">
                    {t("recipes.macroFatShort")} {Math.round(recipe.fat)}
                  </span>
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
