import { ButtonLink } from "@/components/ui/Button";
import { readSessionRole } from "@/lib/auth/sessionRole";
import { getServerT } from "@/lib/serverI18n";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function AppHomePage() {
  const token = (await cookies()).get("fs_token")?.value;
  const sessionRole = token ? readSessionRole(token) : "UNKNOWN";

  if (sessionRole === "USER") {
    redirect("/app/hoy");
  }

  const { t } = await getServerT();
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{t("dashboard.title")}</h1>
        <p className="section-subtitle">{t("dashboard.subtitle")}</p>
      </section>
      <section className="card">
        <ButtonLink href="/app/weekly-review" variant="secondary">{t("weeklyReview.title")}</ButtonLink>
      </section>
      <DashboardClient />
    </div>
  );
}
