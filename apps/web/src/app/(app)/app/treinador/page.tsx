import { getServerT } from "@/lib/serverI18n";
import TrainerHome from "@/components/trainer/TrainerHome";

export default async function TreinadorPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.title")}</h1>
      </header>
      <TrainerHome />
    </section>
  );
}
