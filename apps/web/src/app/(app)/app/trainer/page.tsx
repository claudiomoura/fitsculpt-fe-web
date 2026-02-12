import TrainerHomeClient from "./TrainerHomeClient";
import { getServerT } from "@/lib/serverI18n";

export default async function TrainerPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.title")}</h1>
      </header>
      <TrainerHomeClient />
    </section>
  );
}
