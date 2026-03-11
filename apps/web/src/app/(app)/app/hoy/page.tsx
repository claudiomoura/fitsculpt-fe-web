import { PageContainer } from "@/design-system/components";
import TodayQuickActionsClient from "./TodayQuickActionsClient";

export default async function TodayPage() {
  return (
    <PageContainer as="main" maxWidth="lg" className="px-4 pb-8 pt-10 md:pt-8" data-testid="today-page">
      <TodayQuickActionsClient />
    </PageContainer>
  );
}
