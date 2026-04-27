import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";
import BodyScanClient from "./BodyScanClient";

export default async function BodyScanPage() {
  await redirectToOnboardingIfIncomplete("/app/body-scan");

  return (
    <div className="page page-with-tabbar-safe-area" data-testid="body-scan-page">
      <BodyScanClient />
    </div>
  );
}
