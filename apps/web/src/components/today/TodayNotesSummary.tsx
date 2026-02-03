import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { parseDate } from "@/lib/calendar";

type TodayNotesSummaryData = {
  notes: string;
  date: string;
};

type TodayNotesSummaryProps = {
  data: TodayNotesSummaryData;
};

const MAX_SNIPPET_LENGTH = 140;

export function TodayNotesSummary({ data }: TodayNotesSummaryProps) {
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
  const snippet = data.notes.length > MAX_SNIPPET_LENGTH
    ? `${data.notes.slice(0, MAX_SNIPPET_LENGTH - 1).trimEnd()}…`
    : data.notes;

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <strong>{t("today.notesLatestLabel")}</strong>
        <p className="muted">{snippet}</p>
        {formattedDate ? (
          <span className="muted">
            {t("today.notesLatestDateLabel")} {formattedDate}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export type { TodayNotesSummaryData };
