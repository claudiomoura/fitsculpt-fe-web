import TrackingClient from "../TrackingClient";

export default function BodyScanReportPage() {
  return (
    <div className="page page-with-tabbar-safe-area nutrition-page-shell tracking-page-shell" data-testid="tracking-body-scan-report-page">
      <TrackingClient view="body-scan" />
    </div>
  );
}
