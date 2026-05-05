import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";
import BodyScanReportClient from "./BodyScanReportClient";

export default function BodyScanReportPage() {
  redirectToOnboardingIfIncomplete("/app/seguimiento/body-scan-report");
  
  return (
    <div className="page page-with-tabbar-safe-area nutrition-page-shell tracking-page-shell" data-testid="tracking-body-scan-report-page">
      <BodyScanReportClient />
    </div>
  );
}
