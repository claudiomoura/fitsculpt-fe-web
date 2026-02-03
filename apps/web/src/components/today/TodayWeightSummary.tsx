import { useLanguage } from "@/context/LanguageProvider";

type TodayWeightSummaryData = {
  weightKg: number;
  date: string;
};

type TodayWeightSummaryProps = {
  data: TodayWeightSummaryData;
};

export function TodayWeightSummary({ data }: TodayWeightSummaryProps) {
  const { t } = useLanguage();

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <strong>{t("today.weightLatestLabel")}</strong>
        <div className="stack-sm">
          <span className="today-highlight-value">{data.weightKg} kg</span>
          <span className="muted">{data.date}</span>
        </div>
      </div>
    </div>
  );
}

export type { TodayWeightSummaryData };
