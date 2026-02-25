import { getServerT } from "@/lib/serverI18n";
import TrainerRequestsClient from "@/components/trainer/TrainerRequestsClient";

export default async function TrainerRequestsPage() {
  const { t } = await getServerT();

  return (
    <section className="section-stack">
      <header>
        <h1 className="section-title">{t("trainer.requests.title")}</h1>
      </header>
      <TrainerRequestsClient />
    </section>
  );
}
