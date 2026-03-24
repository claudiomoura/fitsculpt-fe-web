import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";
import styles from "./TodayPage.module.css";

export default async function TodayPage() {
  await redirectToOnboardingIfIncomplete("/app/hoy");

  return (
    <div
      className={`page-with-tabbar-safe-area ${styles.todayScope}`}
      data-testid="today-page"
    >
      <TodayQuickActionsClient />
    </div>
  );
}
