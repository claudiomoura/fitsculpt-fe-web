"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";

type ConfirmPlanActionModalProps = {
  open: boolean;
  planName?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type ConfirmModalCopy = {
  titleKey: string;
  descriptionKey: string;
  confirmKey: string;
  confirmVariant?: "primary" | "danger";
};

function ConfirmPlanActionModal({
  open,
  planName,
  loading = false,
  onCancel,
  onConfirm,
  titleKey,
  descriptionKey,
  confirmKey,
  confirmVariant = "primary",
}: ConfirmPlanActionModalProps & ConfirmModalCopy) {
  const { t } = useLanguage();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t(titleKey)}
      description={t(descriptionKey, { planName: planName ?? t("plansUi.user.unnamedPlan") })}
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>{t("ui.cancel")}</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{t(confirmKey)}</Button>
        </>
      )}
    >
      <p className="muted">{t("plansUi.user.confirmationHint")}</p>
    </Modal>
  );
}

export function ConfirmActivateModal(props: ConfirmPlanActionModalProps) {
  return (
    <ConfirmPlanActionModal
      {...props}
      titleKey="plansUi.user.activate.title"
      descriptionKey="plansUi.user.activate.description"
      confirmKey="plansUi.user.activate.confirm"
    />
  );
}

export function ConfirmDeactivateModal(props: ConfirmPlanActionModalProps) {
  return (
    <ConfirmPlanActionModal
      {...props}
      titleKey="plansUi.user.deactivate.title"
      descriptionKey="plansUi.user.deactivate.description"
      confirmKey="plansUi.user.deactivate.confirm"
      confirmVariant="danger"
    />
  );
}

export function ConfirmDeleteModal(props: ConfirmPlanActionModalProps) {
  return (
    <ConfirmPlanActionModal
      {...props}
      titleKey="plansUi.user.delete.title"
      descriptionKey="plansUi.user.delete.description"
      confirmKey="plansUi.user.delete.confirm"
      confirmVariant="danger"
    />
  );
}
