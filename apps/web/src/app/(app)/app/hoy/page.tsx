import { PageContainer } from "@/design-system/components";
import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function TodayPage() {
  await redirectToOnboardingIfIncomplete("/app/hoy");

  return (
    <PageContainer
      as="main"
      maxWidth="xl"
      className="py-6 md:py-10"
      data-testid="today-page"
    >
      <TodayQuickActionsClient />
    </PageContainer>
  );
}
