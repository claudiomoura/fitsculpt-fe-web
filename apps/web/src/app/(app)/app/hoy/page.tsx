import { PageContainer, Stack } from "@/design-system/components";
import { getServerT } from "@/lib/serverI18n";
import TodayQuickActionsClient from "./TodayQuickActionsClient";

export default async function TodayPage() {
  const { t } = await getServerT();

  return (
    <PageContainer as="main" maxWidth="lg" className="py-6 md:py-8" data-testid="today-page">
      <Stack gap="4">
        <section className="card">
          <span className="inline-flex w-fit items-center rounded-full border border-subtle px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("today.focusSubtitle")}
          </span>
          <h1 className="mt-3 section-title">{t("today.title")}</h1>
          <p className="section-subtitle">{t("today.subtitle")}</p>
        </section>

        <TodayQuickActionsClient />
      </Stack>
    </PageContainer>
  );
}
