import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { parseDate } from "@/lib/calendar";

type TodayWeightSummaryData = {
  weightKg: number;
  date: string;
};

type TodayWeightSummaryProps = {
  data: TodayWeightSummaryData;
};

export function TodayWeightSummary({ data }: TodayWeightSummaryProps) {
  const { t, locale } = useLanguage();
  const weightFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
        maximumFractionDigits: 1,
      }),
    [locale]
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [locale]
  );
  const parsedDate = parseDate(data.date);
  const formattedDate = parsedDate ? dateFormatter.format(parsedDate) : data.date;

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <strong>{t("today.weightLatestLabel")}</strong>
        <div className="stack-sm">
          <span className="today-highlight-value">
            {weightFormatter.format(data.weightKg)} {t("units.kilograms")}
          </span>
          {formattedDate ? (
            <span className="muted">
              {t("today.weightLatestDateLabel")} {formattedDate}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type { TodayWeightSummaryData };
