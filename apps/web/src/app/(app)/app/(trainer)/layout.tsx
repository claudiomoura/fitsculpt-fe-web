import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionRole, tokenHasAnyRole } from "@/lib/auth/sessionRole";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("fs_token")?.value;
  const sessionRole = token ? readSessionRole(token) : "UNKNOWN";
  const canAccessTrainerArea =
    !!token &&
    (sessionRole === "TRAINER" || sessionRole === "ADMIN" || tokenHasAnyRole(token, ["MANAGER", "ROLE_MANAGER"]));

  if (!canAccessTrainerArea) {
    redirect("/app");
  }

  return <div data-section-shell="trainer">{children}</div>;
}
