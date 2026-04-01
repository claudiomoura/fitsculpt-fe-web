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

const MEAL_TYPE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
  { value: "pre-workout", label: "Pre-entreno" },
  { value: "post-workout", label: "Post-entreno" },
];

const DIET_TYPE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "balanced", label: "Equilibrada" },
  { value: "high-protein", label: "Alta en proteína" },
  { value: "low-carb", label: "Baja en carbos" },
  { value: "keto", label: "Keto" },
  { value: "calorie-deficit", label: "Déficit calórico" },
];

const DIFFICULTY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Media" },
  { value: "hard", label: "Difícil" },
];

const CUISINE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "mediterranean", label: "Mediterránea" },
  { value: "asian", label: "Asiática" },
  { value: "mexican", label: "Mexicana" },
  { value: "american", label: "Americana" },
  { value: "spanish", label: "Española" },
  { value: "italian", label: "Italiana" },
  { value: "indian", label: "India" },
];

const GOAL_FIT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "muscle-gain", label: "Ganancia muscular" },
  { value: "weight-loss", label: "Pérdida de peso" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "athletic-performance", label: "Rendimiento atlético" },
  { value: "healthy-lifestyle", label: "Vida saludable" },
];

const MAIN_INGREDIENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "chicken", label: "Pollo" },
  { value: "beef", label: "Carne" },
  { value: "fish", label: "Pescado" },
  { value: "egg", label: "Huevos" },
  { value: "tofu", label: "Tofu" },
  { value: "turkey", label: "Pavo" },
  { value: "shrimp", label: "Gambas" },
  { value: "pasta", label: "Pasta" },
  { value: "rice", label: "Arroz" },
  { value: "quinoa", label: "Quinoa" },
  { value: "pork", label: "Cerdo" },
  { value: "lamb", label: "Cordero" },
];

interface FilterSectionProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

function FilterSection({ label, options, value, onChange }: FilterSectionProps) {
  return (
    <div className="filter-section">
      <label className="filter-label">{label}</label>
      <div className="filter-chips">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`filter-chip ${value === opt.value ? "active" : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RecipeLibraryClient() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [mealType, setMealType] = useState("");
  const [dietType, setDietType] = useState("");
  const [goalFit, setGoalFit] = useState("");
  const [mainIngredient, setMainIngredient] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [difficulty, setDifficulty] = useState("");
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
      } catch (_err) {}
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

        if (mealType) params.set("mealType", mealType);
        if (dietType) params.set("dietType", dietType);
        if (goalFit) params.set("goalFit", goalFit);
        if (mainIngredient) params.set("mainIngredient", mainIngredient);
        if (cuisine) params.set("cuisine", cuisine);
        if (difficulty) params.set("difficulty", difficulty);

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
  }, [debouncedQuery, searchMode, mealType, dietType, goalFit, mainIngredient, cuisine, difficulty, retryKey, t]);

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (debouncedQuery.trim()) {
      filters.push(searchMode === "ingredient" ? `Ingrediente: ${debouncedQuery.trim()}` : `Nombre: ${debouncedQuery.trim()}`);
    }
    if (mealType) {
      const opt = MEAL_TYPE_OPTIONS.find((o) => o.value === mealType);
      filters.push(`Comida: ${opt?.label ?? mealType}`);
    }
    if (dietType) {
      const opt = DIET_TYPE_OPTIONS.find((o) => o.value === dietType);
      filters.push(`Dieta: ${opt?.label ?? dietType}`);
    }
    if (goalFit) {
      const opt = GOAL_FIT_OPTIONS.find((o) => o.value === goalFit);
      filters.push(`Objetivo: ${opt?.label ?? goalFit}`);
    }
    if (mainIngredient) {
      const opt = MAIN_INGREDIENT_OPTIONS.find((o) => o.value === mainIngredient);
      filters.push(`Ingrediente: ${opt?.label ?? mainIngredient}`);
    }
    if (cuisine) {
      const opt = CUISINE_OPTIONS.find((o) => o.value === cuisine);
      filters.push(`Cocina: ${opt?.label ?? cuisine}`);
    }
    if (difficulty) {
      const opt = DIFFICULTY_OPTIONS.find((o) => o.value === difficulty);
      filters.push(`Dificultad: ${opt?.label ?? difficulty}`);
    }
    return filters;
  }, [debouncedQuery, searchMode, mealType, dietType, goalFit, mainIngredient, cuisine, difficulty]);

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

        {/* Filters - horizontal scrollable row */}
        <div className="filters-scroll mt-4">
          <FilterSection label="Tipo de comida" options={MEAL_TYPE_OPTIONS} value={mealType} onChange={setMealType} />
          <FilterSection label="Dieta" options={DIET_TYPE_OPTIONS} value={dietType} onChange={setDietType} />
          <FilterSection label="Dificultad" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} />
          <FilterSection label="Cocina" options={CUISINE_OPTIONS} value={cuisine} onChange={setCuisine} />
          <FilterSection label="Objetivo" options={GOAL_FIT_OPTIONS} value={goalFit} onChange={setGoalFit} />
          <FilterSection label="Ingrediente principal" options={MAIN_INGREDIENT_OPTIONS} value={mainIngredient} onChange={setMainIngredient} />
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
