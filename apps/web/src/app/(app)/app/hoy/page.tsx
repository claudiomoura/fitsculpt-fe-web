import { redirect } from "next/navigation";
import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";
import { resolveDefaultAppPath } from "@/lib/server/sessionRole";
import styles from "./TodayPage.module.css";

export default async function TodayPage() {
  const defaultAppPath = await resolveDefaultAppPath();

  if (defaultAppPath !== "/app" && defaultAppPath !== "/app/hoy") {
    redirect(defaultAppPath);
  }

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
