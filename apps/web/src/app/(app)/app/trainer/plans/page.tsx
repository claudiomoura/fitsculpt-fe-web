import { getServerT } from "@/lib/serverI18n";
import TrainerPlansPageClient from "@/components/trainer/plans/TrainerPlansPageClient";

export default async function TrainerPlansPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.plans.title")}</h1>
      </header>
      <TrainerPlansPageClient />
    </section>
  );
}
