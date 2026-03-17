import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionRole } from "@/lib/auth/sessionRole";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("fs_token")?.value;
  const sessionRole = token ? readSessionRole(token) : "UNKNOWN";

  if (sessionRole !== "TRAINER" && sessionRole !== "ADMIN") {
    redirect("/app");
  }

  return <div data-section-shell="trainer">{children}</div>;
}
