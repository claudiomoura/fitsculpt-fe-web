import { headers } from "next/headers";
import OnboardingClient from "@/app/(app)/app/onboarding/OnboardingClient";
import { registerAction } from "@/app/(auth)/login/actions";

type SearchParams =
  | { error?: string; next?: string; nativeApp?: string; fs_app?: string; capacitor?: string }
  | Promise<{ error?: string; next?: string; nativeApp?: string; fs_app?: string; capacitor?: string }>;

const isNativeAppSignal = (value: string | undefined) => value === "1" || value === "true";

async function isNativeAppRequest(search: Awaited<SearchParams>) {
  if (isNativeAppSignal(search.nativeApp) || isNativeAppSignal(search.fs_app) || isNativeAppSignal(search.capacitor)) {
    return true;
  }

  const headerStore = await headers();
  const requestedWith = headerStore.get("x-requested-with")?.toLowerCase() ?? "";
  const appClient = [
    headerStore.get("x-fitsculpt-app"),
    headerStore.get("x-fitsculpt-client"),
    headerStore.get("x-capacitor"),
    headerStore.get("x-app-platform"),
  ]
    .join(" ")
    .toLowerCase();
  const ua = headerStore.get("user-agent")?.toLowerCase() ?? "";

  return (
    requestedWith.includes("capacitor") ||
    appClient.includes("capacitor") ||
    appClient.includes("fitsculpt") ||
    ua.includes("capacitor") ||
    ua.includes("com.fitsculpt.beta") ||
    (ua.includes("android") && ua.includes("; wv)"))
  );
}

export default async function PublicOnboardingPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) || {};
  const activationError = sp.error === "promo" ? "promo" : sp.error ? "generic" : null;
  const nextUrl = typeof sp.next === "string" ? sp.next : "/app";
  const isNativeApp = await isNativeAppRequest(sp);

  return (
    <OnboardingClient
      mode="guest"
      nextUrl={nextUrl}
      activationAction={registerAction}
      activationError={activationError}
      lockViewport={isNativeApp}
    />
  );
}
