"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";

type CreateNoteModalProps = {
  open: boolean;
  noteValue: string;
  nextReviewDateValue?: string;
  showNextReviewDate?: boolean;
  submitting?: boolean;
  onChangeNote: (value: string) => void;
  onChangeNextReviewDate?: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreateNoteModal({
  open,
  noteValue,
  nextReviewDateValue = "",
  showNextReviewDate = false,
  submitting = false,
  onChangeNote,
  onChangeNextReviewDate,
  onClose,
  onSubmit,
}: CreateNoteModalProps) {
  const { t } = useLanguage();
  const noteId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("trainerClient360.createNote.title")}
      description={t("trainerClient360.createNote.description")}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t("ui.cancel")}</Button>
          <Button onClick={onSubmit} disabled={!noteValue.trim()} loading={submitting}>
            {t("trainerClient360.createNote.confirm")}
          </Button>
        </>
      )}
    >
      <div className="form-stack">
        <div className="ui-input-field">
          <label className="ui-input-label" htmlFor={noteId}>{t("trainerClient360.createNote.noteLabel")}</label>
          <textarea
            id={noteId}
            className="ui-input"
            rows={5}
            value={noteValue}
            onChange={(event) => onChangeNote(event.target.value)}
            placeholder={t("trainerClient360.createNote.notePlaceholder")}
          />
        </div>

        {showNextReviewDate ? (
          <Input
            type="date"
            label={t("trainerClient360.createNote.nextReviewDate")}
            value={nextReviewDateValue}
            onChange={(event) => onChangeNextReviewDate?.(event.target.value)}
          />
        ) : null}
      </div>
    </Modal>
  );
}
