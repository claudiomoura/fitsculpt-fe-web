import WeeklyReviewContent from "../../../weekly-review/WeeklyReviewContent";
import WeeklyReviewModal from "../../WeeklyReviewModal";
import { redirectToOnboardingIfIncomplete } from "@/lib/server/profileGate";

export default async function TodayWeeklyReviewModalPage() {
  await redirectToOnboardingIfIncomplete("/app/weekly-review");

  return (
    <WeeklyReviewModal>
      <WeeklyReviewContent />
    </WeeklyReviewModal>
  );
}
