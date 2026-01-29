"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const ACTIONS = [
  {
    id: "food",
    titleKey: "quickActions.addFood",
    descriptionKey: "quickActions.addFoodDescription",
  },
  {
    id: "set",
    titleKey: "quickActions.addSet",
    descriptionKey: "quickActions.addSetDescription",
  },
  {
    id: "weight",
    titleKey: "quickActions.recordWeight",
    descriptionKey: "quickActions.recordWeightDescription",
    href: "/app/seguimiento",
  },
];

type QuickActionsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function QuickActionsDrawer({ open, onClose }: QuickActionsDrawerProps) {
  const { t } = useLanguage();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("quickActions.title")}
      description={t("quickActions.subtitle")}
      className="quick-actions-modal"
    >
      <div className="quick-actions-grid">
        {ACTIONS.map((action) => (
          <div key={action.id} className="quick-action-card">
            <div>
              <p className="quick-action-title">{t(action.titleKey)}</p>
              <p className="quick-action-description">{t(action.descriptionKey)}</p>
            </div>
            {action.href ? (
              <ButtonLink as={Link} href={action.href} variant="secondary" className="quick-action-button" onClick={onClose}>
                {t("quickActions.open")}
              </ButtonLink>
            ) : (
              <Button variant="secondary" disabled className="quick-action-button">
                {t("quickActions.comingSoon")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
