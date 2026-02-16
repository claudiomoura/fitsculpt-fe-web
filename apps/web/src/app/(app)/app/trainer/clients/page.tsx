import { getServerT } from "@/lib/serverI18n";
import TrainerClientsListClient from "./TrainerClientsListClient";

export default async function TrainerClientsPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.clients.title")}</h1>
      </header>
      <TrainerClientsListClient />
    </section>
  );
}
