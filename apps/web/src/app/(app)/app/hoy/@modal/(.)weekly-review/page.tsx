import WeeklyReviewContent from "../../../weekly-review/WeeklyReviewContent";
import WeeklyReviewModal from "../../WeeklyReviewModal";

export default async function TodayWeeklyReviewModalPage() {
  return (
    <WeeklyReviewModal>
      <WeeklyReviewContent />
    </WeeklyReviewModal>
  );
}
