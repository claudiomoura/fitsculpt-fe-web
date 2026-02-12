import { getServerT } from "@/lib/serverI18n";
import TrainerClientContext from "@/components/trainer/TrainerClientContext";

export default async function TreinadorClientePage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.clientContext.title")}</h1>
      </header>
      <TrainerClientContext />
    </section>
  );
}
