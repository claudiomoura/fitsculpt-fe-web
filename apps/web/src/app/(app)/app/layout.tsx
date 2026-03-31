import AppShellLayout from "@/components/layout/AppShellLayout";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Enforce profile completion on ALL /app/* routes (except onboarding itself)
  // We use a generic returnTo since the layout doesn't have direct pathname access
  await redirectToOnboardingIfIncomplete("/app/hoy");

  return <AppShellLayout shell="app">{children}</AppShellLayout>;
}
