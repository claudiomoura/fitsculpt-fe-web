import { Badge } from "@/components/ui/Badge";
import { useLanguage } from "@/context/LanguageProvider";

type TodayTrainingSummaryData = {
  label?: string;
  focus?: string;
  duration?: number;
};

type TodayTrainingSummaryProps = {
  data: TodayTrainingSummaryData;
};

export function TodayTrainingSummary({ data }: TodayTrainingSummaryProps) {
  const { t } = useLanguage();

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <strong>{data.focus || t("today.trainingSummaryFallback")}</strong>
        {typeof data.duration === "number" ? (
          <p className="muted m-0">
            {data.duration} {t("training.minutesLabel")}
          </p>
        ) : null}
      </div>
      {data.label ? <Badge>{data.label}</Badge> : null}
    </div>
  );
}

export type { TodayTrainingSummaryData };
