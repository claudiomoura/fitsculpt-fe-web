import { PageContainer, Stack } from "@/design-system/components";
import { getServerT } from "@/lib/serverI18n";
import TodayQuickActionsClient from "./TodayQuickActionsClient";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <PageContainer as="main" maxWidth="lg" className="py-6 md:py-8">
      <Stack gap="4">
        <section className="card">
          <Stack gap="3">
            <span className="inline-flex w-fit items-center rounded-full border border-subtle px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t("today.focusSubtitle")}
            </span>
            <div>
              <h1 className="section-title">{t("today.title")}</h1>
              <p className="section-subtitle">{t("today.subtitle")}</p>
            </div>
          </Stack>
        </section>

        <TodayQuickActionsClient />

        <section className="card">
          <h2 className="section-title section-title-sm">{t("today.focusTitle")}</h2>
          <p className="section-subtitle">{t("today.focusSubtitle")}</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            <li className="rounded-xl border border-subtle bg-[var(--bg-panel)] p-3">
              <p className="text-xs font-semibold uppercase text-text-muted">{t("today.focusPlan")}</p>
              <p className="m-0 text-sm font-medium text-text">{t("today.focusPlanValue")}</p>
            </li>
            <li className="rounded-xl border border-subtle bg-[var(--bg-panel)] p-3">
              <p className="text-xs font-semibold uppercase text-text-muted">{t("today.focusNutrition")}</p>
              <p className="m-0 text-sm font-medium text-text">{t("today.focusNutritionValue")}</p>
            </li>
            <li className="rounded-xl border border-subtle bg-[var(--bg-panel)] p-3">
              <p className="text-xs font-semibold uppercase text-text-muted">{t("today.focusRecovery")}</p>
              <p className="m-0 text-sm font-medium text-text">{t("today.focusRecoveryValue")}</p>
            </li>
          </ul>
        </section>
      </Stack>
    </PageContainer>
  );
}
