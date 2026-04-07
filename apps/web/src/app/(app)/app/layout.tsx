import AppShellLayout from "@/components/layout/AppShellLayout";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Enforce profile completion on ALL /app/* routes (except onboarding itself)
  // Use the generic /app landing so role-aware redirects can send users back to
  // the correct home surface after onboarding.
  await redirectToOnboardingIfIncomplete("/app");

  return <AppShellLayout shell="app">{children}</AppShellLayout>;
}
