import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import type { Recipe } from "@/lib/types";
import RecipeDetailClient from "./RecipeDetailClient";
import { getServerT } from "@/lib/serverI18n";

async function fetchRecipe(recipeId: string) {
  try {
    const token = (await cookies()).get("fs_token")?.value;
    const authCookie = token ? `fs_token=${token}` : "";
    const response = await fetch(`${getBackendUrl()}/recipes/${recipeId}`, {
      headers: authCookie ? { cookie: authCookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) {
      return { recipe: null, ok: false };
    }
    const data = (await response.json()) as Recipe;
    return { recipe: data, ok: true };
  } catch (_err) {
    return { recipe: null, ok: false };
  }
}

export default async function RecipeDetailPage(props: {
  params: Promise<{ recipeId: string }>;
}) {
  const { t } = await getServerT();
  const { recipeId } = await props.params;

  if (!recipeId) {
    return (
      <div className="page">
        <section className="card centered-card">
          <p className="muted">{t("recipes.loadError")}</p>
        </section>
      </div>
    );
  }

  const { recipe, ok } = await fetchRecipe(recipeId);
  const error = ok ? null : t("recipes.loadError");

  return (
    <div className="page">
      <RecipeDetailClient recipe={recipe} error={error} />
    </div>
  );
}
