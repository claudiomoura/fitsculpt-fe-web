"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageProvider";

type NotesPanelProps = {
  notes: ReactNode[];
  onAddNote: () => void;
};

export function NotesPanel({ notes, onAddNote }: NotesPanelProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trainerClient360.notes.title")}</CardTitle>
      </CardHeader>
      <CardContent className="form-stack">
        {notes.length ? (
          <ul className="form-stack" style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("trainerClient360.notes.empty")}</p>
        )}

        <Button variant="secondary" onClick={onAddNote}>{t("trainerClient360.notes.addCta")}</Button>
      </CardContent>
    </Card>
  );
}
