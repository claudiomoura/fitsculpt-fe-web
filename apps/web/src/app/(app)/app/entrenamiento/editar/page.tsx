import TrainingPlanClient from "../TrainingPlanClient";
import TrainerDayEditorClient from "@/components/trainer/plans/TrainerDayEditorClient";
import { getServerT } from "@/lib/serverI18n";

type Props = {
  searchParams?: Promise<{ day?: string; planId?: string }>;
};

export default async function TrainingPlanEditPage({ searchParams }: Props) {
  const { t } = await getServerT();
  const params = searchParams ? await searchParams : undefined;
  const day = params?.day?.trim() ?? "";
  const planId = params?.planId?.trim() ?? "";

  if (day && planId) {
    return (
      <div className="page">
        <section className="card">
          <h1 className="section-title">{t("trainer.plans.dayEditorTitle")}</h1>
          <p className="section-subtitle">{t("trainer.plans.dayEditorSubtitle")}</p>
        </section>
        <TrainerDayEditorClient planId={planId} day={day} />
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("training.manualPlanTitle")}</h1>
        <p className="section-subtitle">{t("training.manualPlanSubtitle")}</p>
      </section>
      <TrainingPlanClient mode="manual" />
    </div>
  );
}
