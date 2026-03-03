import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionRole } from "@/lib/auth/sessionRole";
import { getBackendUrl } from "@/lib/backend";

type AuthMePayload = {
  role?: string;
};

type MembershipPayload = {
  status?: string;
  role?: string;
};

async function fetchWithToken<T>(path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      headers: {
        cookie: `fs_token=${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("fs_token")?.value;

  if (!token) {
    redirect("/login");
  }

  if (readSessionRole(token) === "ADMIN") {
    return <div data-section-shell="trainer">{children}</div>;
  }

  const authMe = await fetchWithToken<AuthMePayload>("/auth/me", token);
  if ((authMe?.role ?? "").toUpperCase() === "ADMIN") {
    return <div data-section-shell="trainer">{children}</div>;
  }

  const membership = await fetchWithToken<MembershipPayload>("/gyms/membership", token);
  const membershipStatus = (membership?.status ?? "").toUpperCase();
  const membershipRole = (membership?.role ?? "").toUpperCase();

  if (membershipStatus === "ACTIVE" && (membershipRole === "TRAINER" || membershipRole === "ADMIN")) {
    return <div data-section-shell="trainer">{children}</div>;
  }

  redirect("/app");
}
