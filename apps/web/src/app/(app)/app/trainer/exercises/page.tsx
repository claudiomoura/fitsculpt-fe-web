import { getServerT } from "@/lib/serverI18n";
import TrainerExercisesClient from "@/components/trainer-exercises/TrainerExercisesClient";

export default async function TrainerExercisesPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.title")}</h1>
      </header>
      <TrainerExercisesClient />
    </section>
  );
}
