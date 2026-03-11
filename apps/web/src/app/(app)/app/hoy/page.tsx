import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0PageHero } from "@/components/surfaces/V0PageHero";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <div className="page" data-testid="today-page">
      <V0PageHero
        eyebrow={t("nav.today")}
        title={t("today.title")}
        subtitle={t("today.subtitle")}
        actions={
          <>
            <ButtonLink variant="ghost" href="/app/entrenamiento">
{t("today.trainingCta")}
            </ButtonLink>
            <ButtonLink variant="secondary" href="/app/seguimiento#checkin-entry">
              {t("today.checkinSecondaryCta")}
            </ButtonLink>
          </>
        }
      />
      <TodayQuickActionsClient />
    </div>
  );
}
