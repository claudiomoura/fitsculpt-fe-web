"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/context/LanguageProvider";
import type { Exercise } from "@/lib/types";


type SelectedExerciseRef = {
  exerciseId: string;
  name: string;
};

type Props = {
  disabled?: boolean;
  selectedExercises: SelectedExerciseRef[];
  onSelect: (exercise: SelectedExerciseRef) => void;
};

export default function ExerciseLibrarySelector({ disabled = false, selectedExercises, onSelect }: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [results, setResults] = useState<Exercise[]>([]);

  const selectedIds = useMemo(() => new Set(selectedExercises.map((item) => item.exerciseId)), [selectedExercises]);

  useEffect(() => {
    if (disabled) return;
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(false);
      const result = await searchExercises({ query: normalizedQuery, page: 1, limit: 8 }, controller.signal);
      if (!result.ok) {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchError(true);
          setSearching(false);
        }
        return;
      }

      if (!controller.signal.aborted) {
        setResults(result.data.items);
        setSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [disabled, query]);

  return (
    <div className="form-stack" style={{ gap: 8 }}>
      <Input
        label={t("trainer.plans.wizard.exerciseSearchLabel")}
        value={query}
        disabled={disabled}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          if (nextQuery.trim().length < 2) {
            setResults([]);
            setSearching(false);
            setSearchError(false);
          }
        }}
        placeholder={t("trainer.plans.wizard.exerciseSearchPlaceholder")}
      />

      {searching ? <p className="muted" style={{ margin: 0 }}>{t("common.loading")}</p> : null}
      {searchError ? <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.wizard.exerciseSearchError")}</p> : null}

      {!searching && !searchError && query.trim().length >= 2 ? (
        results.length > 0 ? (
          <ul className="form-stack" style={{ margin: 0, listStyle: "none", paddingInlineStart: 0, gap: 6 }}>
            {results.map((exercise) => (
              <li key={exercise.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={disabled || selectedIds.has(exercise.id)}
                  onClick={() => onSelect({ exerciseId: exercise.id, name: exercise.name })}
                >
                  {exercise.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ margin: 0 }}>{t("trainer.plans.wizard.exerciseSearchEmpty")}</p>
        )
      ) : null}
    </div>
  );
}

