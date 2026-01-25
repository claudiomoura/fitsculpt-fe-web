import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import type { Recipe } from "@/lib/types";
import RecipeDetailClient from "./RecipeDetailClient";

async function fetchRecipe(recipeId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${getBackendUrl()}/recipes/${recipeId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { recipe: null, error: "No se pudo cargar la receta." };
    }
    const data = (await response.json()) as Recipe;
    return { recipe: data, error: null };
  } catch {
    return { recipe: null, error: "No se pudo cargar la receta." };
  }
}

export default async function RecipeDetailPage(props: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await props.params;

  if (!recipeId) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">No se pudo cargar la receta.</p>
        </section>
      </div>
    );
  }

  const { recipe, error } = await fetchRecipe(recipeId);

  return (
    <div className="page">
      <RecipeDetailClient recipe={recipe} error={error} />
    </div>
  );
}
