import { getServerT } from "@/lib/serverI18n";
import TrainerRecipesClient from "@/components/trainer-recipes/TrainerRecipesClient";

export default async function TrainerRecipesPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">Recetas del Entrenador</h1>
      </header>
      <TrainerRecipesClient />
    </section>
  );
}