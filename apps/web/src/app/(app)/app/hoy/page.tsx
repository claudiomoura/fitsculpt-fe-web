import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function TodayPage() {
  await redirectToOnboardingIfIncomplete("/app/hoy");

  return (
    <main className="page page-with-tabbar-safe-area nutrition-page-shell today-page-shell" data-testid="today-page">
      <TodayQuickActionsClient />
    </main>
  );
}
