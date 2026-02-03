import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { parseDate } from "@/lib/calendar";

type TodayEnergySummaryData = {
  energy: number;
  date: string;
};

type TodayEnergySummaryProps = {
  data: TodayEnergySummaryData;
};

export function TodayEnergySummary({ data }: TodayEnergySummaryProps) {
  const { t, locale } = useLanguage();
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
        <strong>{t("today.energyLatestLabel")}</strong>
        <div className="stack-sm">
          <span className="today-highlight-value">
            {data.energy} {t("today.energyScale")}
          </span>
          {formattedDate ? (
            <span className="muted">
              {t("today.energyLatestDateLabel")} {formattedDate}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type { TodayEnergySummaryData };
