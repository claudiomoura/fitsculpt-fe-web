"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import type { Recipe } from "@/lib/types";
import { TrainerRecipeModal } from "./TrainerRecipeModal";
import { RecipeImage } from "@/components/nutrition/RecipeImage";

type LoadState = "loading" | "ready" | "error";

type RecipesResponse = {
  recipes?: Recipe[];
  items?: Recipe[];
};

export default function TrainerRecipesClient() {
  const { t } = useLanguage();
  const [recipesState, setRecipesState] = useState<LoadState>("loading");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const loadRecipes = useCallback(async () => {
    setRecipesState("loading");
    try {
      const response = await fetch("/api/trainer/recipes", { cache: "no-store" });
      if (!response.ok) {
        setRecipesState("error");
        return;
      }
      const data = (await response.json()) as RecipesResponse;
      const source = Array.isArray(data.recipes) ? data.recipes : Array.isArray(data.items) ? data.items : [];
      setRecipes(source);
      setRecipesState("ready");
    } catch (_err) {
      setRecipesState("error");
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filteredRecipes = useMemo(() => {
    let filtered = recipes;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(lower) ||
          recipe.description?.toLowerCase().includes(lower)
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter((recipe) => recipe.category === selectedCategory);
    }
    return filtered;
  }, [recipes, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    recipes.forEach((recipe) => {
      if (recipe.category) cats.add(recipe.category);
    });
    return Array.from(cats).sort();
  }, [recipes]);

  const handleDelete = async (recipeId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta receta?")) return;
    try {
      const response = await fetch(`/api/trainer/recipes/${recipeId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
  };

  const handleCreate = async (data: Partial<Recipe>) => {
    const response = await fetch("/api/trainer/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error creating recipe" }));
      throw new Error(error.error || "Error creating recipe");
    }
    const newRecipe = await response.json();
    setRecipes((prev) => [newRecipe, ...prev]);
    setIsCreating(false);
  };

  const handleUpdate = async (id: string, data: Partial<Recipe>) => {
    const response = await fetch(`/api/trainer/recipes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Error updating recipe" }));
      throw new Error(error.error || "Error updating recipe");
    }
    const updated = await response.json();
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? updated : r))
    );
    setEditingRecipe(null);
  };

  if (recipesState === "loading") {
    return <div className="p-4">Cargando recetas...</div>;
  }

  if (recipesState === "error") {
    return <div className="p-4 text-red-500">Error al cargar recetas</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Mis Recetas</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary"
        >
          Nueva Receta
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar recetas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered flex-1"
        />
        <select
          value={selectedCategory || ""}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="select select-bordered"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe) => (
          <div key={recipe.id} className="card bg-base-100 shadow">
            <figure className="px-4 pt-4">
              <RecipeImage
                src={recipe.photoUrl || recipe.imageUrls?.[0]}
                alt={recipe.name}
                width={200}
                height={200}
                className="rounded-xl object-cover w-full h-32"
              />
            </figure>
            <div className="card-body">
              <h3 className="card-title">{recipe.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{recipe.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {recipe.category && (
                  <span className="badge badge-outline">{recipe.category}</span>
                )}
                <span className="badge badge-outline">
                  {recipe.calories} kcal
                </span>
                {recipe.tiempoPreparacion && (
                  <span className="badge badge-outline">
                    {recipe.tiempoPreparacion} min
                  </span>
                )}
                {recipe.porciones && (
                  <span className="badge badge-outline">
                    {recipe.porciones} porciones
                  </span>
                )}
              </div>
              <div className="card-actions justify-end mt-4">
                <button
                  onClick={() => setEditingRecipe(recipe)}
                  className="btn btn-sm btn-outline"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(recipe.id)}
                  className="btn btn-sm btn-outline btn-error"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron recetas
        </div>
      )}

      {/* Create/Edit Modal */}
      <TrainerRecipeModal
        open={isCreating}
        recipe={null}
        onClose={() => setIsCreating(false)}
        onSubmit={handleCreate}
      />
      <TrainerRecipeModal
        open={!!editingRecipe}
        recipe={editingRecipe}
        onClose={() => setEditingRecipe(null)}
        onSubmit={(data) => handleUpdate(editingRecipe!.id, data)}
      />
    </div>
  );
}