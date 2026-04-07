import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { getDefaultAppPathForSessionRole, readSessionRole } from "@/lib/auth/sessionRole";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";
import styles from "./TodayPage.module.css";

export default async function TodayPage() {
  const token = (await cookies()).get("fs_token")?.value;
  const sessionRole = token ? readSessionRole(token) : "UNKNOWN";
  const defaultAppPath = getDefaultAppPathForSessionRole(sessionRole);

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
