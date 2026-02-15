"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type DayOption = {
  id: string;
  label: string;
  focus: string;
};

type Props = {
  open: boolean;
  exerciseName: string;
  days: DayOption[];
  loadingPlan: boolean;
  loadError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  canSubmit: boolean;
  emptyCtaHref: string;
  onClose: () => void;
  onConfirm: (dayId: string) => void;
  onRetryLoad: () => void;
};

export default function AddExerciseDayPickerModal({
  open,
  exerciseName,
  days,
  loadingPlan,
  loadError,
  isSubmitting,
  submitError,
  canSubmit,
  emptyCtaHref,
  onClose,
  onConfirm,
  onRetryLoad,
}: Props) {
  const { t } = useLanguage();
  const [selectedDayId, setSelectedDayId] = useState("");

  const hasDays = days.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("library.addToPlanModalTitle")}
      description={t("library.addToPlanModalDescription").replace("{exercise}", exerciseName)}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={onClose}>
            {t("ui.cancel")}
          </Button>
          <Button onClick={() => onConfirm(selectedDayId)} disabled={!selectedDayId || isSubmitting || !canSubmit} loading={isSubmitting}>
            {t("library.addToPlanConfirm")}
          </Button>
        </div>
      }
    >
      <div className="form-stack">
        {loadingPlan ? <p className="muted">{t("library.addToPlanLoading")}</p> : null}

        {!loadingPlan && loadError ? (
          <div className="form-stack">
            <p className="muted">{loadError}</p>
            <Button variant="secondary" onClick={onRetryLoad}>
              {t("ui.retry")}
            </Button>
          </div>
        ) : null}

        {!loadingPlan && !loadError && !hasDays ? (
          <div className="feature-card form-stack">
            <p className="muted" style={{ margin: 0 }}>{t("library.addToPlanNoPlan")}</p>
            <Link className="btn secondary" href={emptyCtaHref} onClick={onClose}>
              {t("library.addToPlanNoPlanCta")}
            </Link>
          </div>
        ) : null}

        {!loadingPlan && !loadError && hasDays ? (
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("library.addToPlanDayLabel")}</span>
            <select value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)}>
              <option value="">{t("library.addToPlanDayPlaceholder")}</option>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label} · {day.focus}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {submitError ? <p className="muted">{submitError}</p> : null}
      </div>
    </Modal>
  );
}
