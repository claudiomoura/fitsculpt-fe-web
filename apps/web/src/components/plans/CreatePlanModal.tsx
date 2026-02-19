"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";

type CreatePlanModalProps = {
  open: boolean;
  name: string;
  daysCount: number;
  loading?: boolean;
  disabled?: boolean;
  error?: boolean;
  onNameChange: (value: string) => void;
  onDaysCountChange: (value: number) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreatePlanModal({
  open,
  name,
  daysCount,
  loading = false,
  disabled = false,
  error = false,
  onNameChange,
  onDaysCountChange,
  onClose,
  onSubmit,
}: CreatePlanModalProps) {
  const { t } = useLanguage();

  const hasName = name.trim().length > 0;
  const isValidDays = Number.isInteger(daysCount) && daysCount >= 1 && daysCount <= 7;
  const canSubmit = useMemo(() => hasName && isValidDays && !loading && !disabled, [disabled, hasName, isValidDays, loading]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("plansUi.trainer.create.title")}
      description={disabled ? t("plansUi.trainer.create.notAvailable") : t("plansUi.trainer.create.description")}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t("ui.cancel")}</Button>
          <Button onClick={onSubmit} disabled={!canSubmit} loading={loading}>{t("plansUi.trainer.create.confirm")}</Button>
        </>
      )}
    >
      <div className="form-stack" style={{ gap: 10 }}>
        <label className="form-stack" style={{ gap: 6 }}>
          <span>{t("plansUi.trainer.create.nameLabel")}</span>
          <Input value={name} maxLength={80} onChange={(event) => onNameChange(event.target.value)} disabled={disabled} />
          {!hasName ? <p className="muted">{t("plansUi.trainer.create.nameRequired")}</p> : null}
        </label>

        <label className="form-stack" style={{ gap: 6 }}>
          <span>{t("plansUi.trainer.create.daysLabel")}</span>
          <Input
            type="number"
            min={1}
            max={7}
            value={daysCount}
            onChange={(event) => onDaysCountChange(Number.parseInt(event.target.value, 10) || 0)}
            disabled={disabled}
          />
          {!isValidDays ? <p className="muted">{t("plansUi.trainer.create.daysHelp")}</p> : null}
        </label>

        {error ? <p role="alert">{t("plansUi.trainer.create.error")}</p> : null}
      </div>
    </Modal>
  );
}
