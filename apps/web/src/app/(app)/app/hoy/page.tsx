import { PageContainer } from "@/design-system/components";
import TodayQuickActionsClient from "./TodayQuickActionsClient";

export default async function TodayPage() {
  return (
    <PageContainer
      as="main"
      maxWidth="lg"
      className="py-6 md:py-10"
      style={{ background: "#0B0E13" }}
      data-testid="today-page"
    >
      <TodayQuickActionsClient />
    </PageContainer>
  );
}
