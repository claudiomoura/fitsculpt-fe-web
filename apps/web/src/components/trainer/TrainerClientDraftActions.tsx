"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import {
  getTrainerAdjustmentDrafts,
  getTrainerNoteDrafts,
  saveTrainerAdjustmentDraft,
  saveTrainerNoteDraft,
  type TrainerAdjustmentDraft,
  type TrainerNoteDraft,
} from "@/lib/trainerClientDrafts";

type TrainerClientDraftActionsProps = {
  clientId: string;
};

type FeedbackTone = "success" | "error";

export default function TrainerClientDraftActions({ clientId }: TrainerClientDraftActionsProps) {
  const { t } = useLanguage();
  const [noteInput, setNoteInput] = useState("");
  const [adjustmentInput, setAdjustmentInput] = useState("");
  const [notes, setNotes] = useState<TrainerNoteDraft[]>([]);
  const [adjustments, setAdjustments] = useState<TrainerAdjustmentDraft[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [adjustmentFeedback, setAdjustmentFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);

  useEffect(() => {
    setNotes(getTrainerNoteDrafts(clientId));
    setAdjustments(getTrainerAdjustmentDrafts(clientId));
  }, [clientId]);

  const handleSaveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = noteInput.trim();

    if (!content) {
      setNoteFeedback({ tone: "error", message: t("trainer.clientContext.drafts.noteInvalid") });
      return;
    }

    const next = saveTrainerNoteDraft(clientId, content);
    if (!next) {
      setStorageError(true);
      setNoteFeedback({ tone: "error", message: t("trainer.clientContext.drafts.saveError") });
      return;
    }

    setStorageError(false);
    setNotes(next);
    setNoteInput("");
    setNoteFeedback({ tone: "success", message: t("trainer.clientContext.drafts.noteSaved") });
  };

  const handleSaveAdjustment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = adjustmentInput.trim();

    if (!content) {
      setAdjustmentFeedback({ tone: "error", message: t("trainer.clientContext.drafts.adjustmentInvalid") });
      return;
    }

    const next = saveTrainerAdjustmentDraft(clientId, content);
    if (!next) {
      setStorageError(true);
      setAdjustmentFeedback({ tone: "error", message: t("trainer.clientContext.drafts.saveError") });
      return;
    }

    setStorageError(false);
    setAdjustments(next);
    setAdjustmentInput("");
    setAdjustmentFeedback({ tone: "success", message: t("trainer.clientContext.drafts.adjustmentSaved") });
  };

  return (
    <section className="card form-stack" aria-labelledby="trainer-client-drafts-title">
      <h3 id="trainer-client-drafts-title" style={{ margin: 0 }}>
        {t("trainer.clientContext.drafts.title")}
      </h3>
      <p className="muted" style={{ margin: 0 }}>
        {t("trainer.clientContext.drafts.localOnly")}
      </p>

      {storageError ? <p className="muted">{t("trainer.clientContext.drafts.storageWarning")}</p> : null}

      <div className="form-stack">
        <h4 style={{ margin: 0 }}>{t("trainer.clientContext.drafts.noteFormTitle")}</h4>
        <form className="form-stack" onSubmit={handleSaveNote}>
          <label htmlFor="trainer-note-input">{t("trainer.clientContext.drafts.noteLabel")}</label>
          <textarea
            id="trainer-note-input"
            className="input"
            rows={4}
            value={noteInput}
            onChange={(event) => setNoteInput(event.target.value)}
            placeholder={t("trainer.clientContext.drafts.notePlaceholder")}
          />
          <button type="submit" className="btn" style={{ width: "fit-content" }}>
            {t("trainer.clientContext.drafts.noteSubmit")}
          </button>
          {noteFeedback ? (
            <p className="muted" role="status" aria-live="polite">
              {noteFeedback.message}
            </p>
          ) : null}
        </form>

        <div className="form-stack" aria-live="polite">
          <h4 style={{ margin: 0 }}>{t("trainer.clientContext.drafts.notesListTitle")}</h4>
          {notes.length === 0 ? (
            <p className="muted">{t("trainer.clientContext.drafts.notesEmpty")}</p>
          ) : (
            <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
              {notes.map((note) => (
                <li key={note.id}>
                  <p style={{ margin: "0 0 4px" }}>{note.content}</p>
                  <p className="muted" style={{ margin: 0 }}>
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="form-stack">
        <h4 style={{ margin: 0 }}>{t("trainer.clientContext.drafts.adjustmentFormTitle")}</h4>
        <form className="form-stack" onSubmit={handleSaveAdjustment}>
          <label htmlFor="trainer-adjustment-input">{t("trainer.clientContext.drafts.adjustmentLabel")}</label>
          <textarea
            id="trainer-adjustment-input"
            className="input"
            rows={4}
            value={adjustmentInput}
            onChange={(event) => setAdjustmentInput(event.target.value)}
            placeholder={t("trainer.clientContext.drafts.adjustmentPlaceholder")}
          />
          <button type="submit" className="btn" style={{ width: "fit-content" }}>
            {t("trainer.clientContext.drafts.adjustmentSubmit")}
          </button>
          {adjustmentFeedback ? (
            <p className="muted" role="status" aria-live="polite">
              {adjustmentFeedback.message}
            </p>
          ) : null}
        </form>

        <div className="form-stack" aria-live="polite">
          <h4 style={{ margin: 0 }}>{t("trainer.clientContext.drafts.adjustmentsListTitle")}</h4>
          {adjustments.length === 0 ? (
            <p className="muted">{t("trainer.clientContext.drafts.adjustmentsEmpty")}</p>
          ) : (
            <ul className="form-stack" style={{ margin: 0, paddingInlineStart: 20 }}>
              {adjustments.map((adjustment) => (
                <li key={adjustment.id}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <p style={{ margin: 0 }}>{adjustment.content}</p>
                    <span className="badge">{t("trainer.clientContext.drafts.pendingLocalBadge")}</span>
                  </div>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {new Date(adjustment.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
