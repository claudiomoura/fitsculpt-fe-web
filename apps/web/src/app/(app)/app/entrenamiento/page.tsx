import TrainingPlanClient from "./TrainingPlanClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0TrainingShell } from "@/components/v0/screens/V0TrainingShell";
import { V0Card } from "@/components/v0/ui/V0Card";
import { V0SectionHeader } from "@/components/v0/ui/V0SectionHeader";

export default async function TrainingPlanPage() {
  const { t } = await getServerT();

  return (
    <V0TrainingShell title={t("app.trainingTitle")}>
      <div className="page stack-md">
        <V0Card>
          <V0SectionHeader
            title={t("nav.trainingPlan")}
            actions={
              <div className="v0-route-shell__actions" aria-label={t("nav.trainingPlan")}>
                <ButtonLink variant="secondary" href="/app/biblioteca/entrenamientos">
                  {t("training.openFromLibrary")}
                </ButtonLink>
                <ButtonLink href="/app/entrenamiento?ai=1">{t("training.aiGenerate")}</ButtonLink>
              </div>
            }
          />
        </V0Card>
        <V0Card className="[&_.card]:border-white/10 [&_.card]:bg-white/5 [&_.ui-card]:border-white/10 [&_.ui-card]:bg-white/5">
          <TrainingPlanClient mode="suggested" />
        </V0Card>
      </div>
    </V0TrainingShell>
  );
}
