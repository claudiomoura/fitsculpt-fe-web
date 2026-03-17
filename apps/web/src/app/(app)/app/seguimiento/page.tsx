import TrackingClient from "./TrackingClient";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function TrackingPage() {
  await redirectToOnboardingIfIncomplete("/app/seguimiento");

  return (
    <div className="page">
      <TrackingClient />
    </div>
  );
}
