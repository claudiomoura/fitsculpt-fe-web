import TrackingClient from "./TrackingClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function TrackingPage() {
  await redirectToOnboardingIfIncomplete("/app/seguimiento");

  return (
    <main className="page page-with-tabbar-safe-area app-page-shell app-page-shell--default tracking-page-shell" data-testid="tracking-page-shell">
      <TrackingClient />
    </main>
  );
}
