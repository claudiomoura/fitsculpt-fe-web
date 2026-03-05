"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";
import { toDateKey } from "@/lib/calendar";
import { createTrackingEntry } from "@/services/tracking";

type CheckInModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (weightKg: number) => void;
  onSavingChange?: (isSaving: boolean) => void;
};

export function CheckInModal({ open, onClose, onSaved, onSavingChange }: CheckInModalProps) {
  const { t } = useLanguage();
  const [weight, setWeight] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const weightError = useMemo(() => {
    const value = Number(weight);
    const valid = Number.isFinite(value) && value > 0;
    return valid ? "" : t("today.checkinWeightValidation");
  }, [t, weight]);

  const resetForm = () => {
    setWeight("");
    setTouched(false);
    setSubmitError("");
    setIsSaving(false);
  };

  async function handleSave() {
    setTouched(true);
    setSubmitError("");
    if (isSaving || weightError) return;

    setIsSaving(true);
    onSavingChange?.(true);

    try {
      const weightValue = Number(weight);
      await createTrackingEntry("checkins", {
        id: `today-checkin-${Date.now()}`,
        date: toDateKey(new Date()),
        weightKg: weightValue,
        chestCm: 0,
        waistCm: 0,
        hipsCm: 0,
        bicepsCm: 0,
        thighCm: 0,
        calfCm: 0,
        neckCm: 0,
        bodyFatPercent: 0,
        energy: 0,
        hunger: 0,
        notes: "",
        recommendation: "",
        frontPhotoUrl: null,
        sidePhotoUrl: null,
      });
      onSaved(weightValue);
      resetForm();
    } catch {
      setSubmitError(t("today.checkinSaveError"));
    } finally {
      setIsSaving(false);
      onSavingChange?.(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (isSaving) return;
        onClose();
        resetForm();
      }}
      title={t("today.checkinModalTitle")}
      className="today-premium-modal"
    >
      <div className="grid gap-4" data-testid="checkin-modal">
        <Input
          label={t("today.checkinWeightLabel")}
          type="number"
          min={1}
          inputMode="decimal"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          errorText={touched ? weightError : ""}
        />

        {submitError ? <p className="m-0 text-sm text-rose-300">{submitError}</p> : null}

        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={handleSave} className="min-h-11 sm:order-2" loading={isSaving} data-testid="checkin-save">
            {t("today.checkinModalSave")}
          </Button>
          <Button variant="secondary" onClick={() => { onClose(); resetForm(); }} className="min-h-11 sm:order-1" disabled={isSaving}>
            {t("today.checkinModalCancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
