import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { readSessionRole } from "@/lib/auth/sessionRole";

function isMembershipPayload(payload: unknown): payload is { status: string; role: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { status?: unknown }).status === "string" &&
    typeof (payload as { role?: unknown }).role === "string"
  );
}

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("fs_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const sessionRole = readSessionRole(token);

  if (sessionRole === "ADMIN") {
    return <div data-section-shell="trainer">{children}</div>;
  }

  const membershipResult = await fetchBackend("/gyms/membership");

  if (membershipResult.status !== 200) {
    redirect("/app");
  }

  if (!isMembershipPayload(membershipResult.payload)) {
    redirect("/app");
  }

  if (membershipResult.payload.status === "ACTIVE" && (membershipResult.payload.role === "TRAINER" || membershipResult.payload.role === "ADMIN")) {
    return <div data-section-shell="trainer">{children}</div>;
  }

  redirect("/app");
}
