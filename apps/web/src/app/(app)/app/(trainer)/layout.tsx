import { redirect } from "next/navigation";
import { resolveServerSessionRole } from "@/lib/server/sessionRole";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const sessionRole = await resolveServerSessionRole();

  if (sessionRole !== "TRAINER" && sessionRole !== "ADMIN") {
    redirect("/app");
  }

  return <div data-section-shell="trainer">{children}</div>;
}
