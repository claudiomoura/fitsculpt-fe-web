import TodayQuickActionsClient from "./TodayQuickActionsClient";
import { V0HomeShell } from "@/components/v0";

export default function TodayPage() {
  return (
    <div className="page" data-testid="today-page">
      <V0HomeShell>
        <TodayQuickActionsClient />
      </V0HomeShell>
    </div>
  );
}
