import { getServerT } from "@/lib/serverI18n";
import TrainerClientContextClient from "./TrainerClientContextClient";

export default async function TrainerClientPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.clientContext.title")}</h1>
      </header>
      <TrainerClientContextClient />
    </section>
  );
}
