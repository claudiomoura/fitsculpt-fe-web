import WeeklyReviewContent from "./WeeklyReviewContent";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function WeeklyReviewPage() {
  await redirectToOnboardingIfIncomplete("/app/weekly-review");

  return (
    <div className="page page-with-tabbar-safe-area">
      <WeeklyReviewContent />
    </div>
  );
}
