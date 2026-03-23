import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";
import styles from "./TodayPage.module.css";

export default async function TodayPage() {
  await redirectToOnboardingIfIncomplete("/app/hoy");

  return (
    <div className={`page page-with-tabbar-safe-area nutrition-page-shell ${styles.todayScope}`} data-testid="today-page">
      <TodayQuickActionsClient />
    </div>
  );
}
