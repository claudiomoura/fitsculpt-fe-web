import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchBackend } from "@/app/api/gyms/_proxy";
import { readSessionRole } from "@/lib/auth/sessionRole";

type MembershipPayload = {
  status: string;
  role: string;
};

type AuthMePayload = {
  role: string;
};

function isMembershipPayload(value: unknown): value is MembershipPayload {
  if (typeof value !== "object" || value === null) return false;

  const payload = value as Record<string, unknown>;
  return typeof payload.status === "string" && typeof payload.role === "string";
}

function isAuthMePayload(value: unknown): value is AuthMePayload {
  if (typeof value !== "object" || value === null) return false;

  const payload = value as Record<string, unknown>;
  return typeof payload.role === "string";
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

  const authMeResult = await fetchBackend("/auth/me");
  if (authMeResult.status === 200 && isAuthMePayload(authMeResult.payload) && authMeResult.payload.role === "ADMIN") {
    return <div data-section-shell="trainer">{children}</div>;
  }

  const membershipResult = await fetchBackend("/gyms/membership");
  if (
    membershipResult.status === 200 &&
    isMembershipPayload(membershipResult.payload) &&
    membershipResult.payload.status === "ACTIVE" &&
    (membershipResult.payload.role === "TRAINER" || membershipResult.payload.role === "ADMIN")
  ) {
    return <div data-section-shell="trainer">{children}</div>;
  }

  redirect("/app");

  return null;
}
