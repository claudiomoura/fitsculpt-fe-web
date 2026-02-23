import { getServerT } from "@/lib/serverI18n";
import TrainerExerciseCreateForm from "@/components/trainer-exercises/TrainerExerciseCreateForm";

export default async function TrainerExerciseCreatePage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("training.manualCreate")}</h1>
      </header>
      <TrainerExerciseCreateForm />
    </section>
  );
}
