import OnboardingClient from "@/app/(app)/app/onboarding/OnboardingClient";
import { registerAction } from "@/app/(auth)/login/actions";

type SearchParams =
  | { error?: string; next?: string }
  | Promise<{ error?: string; next?: string }>;

export default async function PublicOnboardingPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) || {};
  const activationError = sp.error === "promo" ? "promo" : sp.error ? "generic" : null;
  const nextUrl = typeof sp.next === "string" ? sp.next : "/app";

  return <OnboardingClient mode="guest" nextUrl={nextUrl} activationAction={registerAction} activationError={activationError} />;
}
