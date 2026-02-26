import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionRole } from "@/lib/auth/sessionRole";

const TRAINER_ALLOWED_ROLES = new Set<string>(["TRAINER", "ADMIN"]);

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("fs_token")?.value;
  const sessionRole = token ? readSessionRole(token) : "UNKNOWN";

  if (!TRAINER_ALLOWED_ROLES.has(sessionRole)) {
    redirect("/app");
  }

  return <div data-section-shell="trainer">{children}</div>;
}
