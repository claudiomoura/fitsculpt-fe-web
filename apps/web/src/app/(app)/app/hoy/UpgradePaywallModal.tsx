"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";

type PaywallContext = "training" | "nutrition";

type UpgradePaywallModalProps = {
  open: boolean;
  onClose: () => void;
  context: PaywallContext;
  onGoBilling: () => void;
};

const PLAN_TIERS = ["FREE", "STRENGTH_AI", "NUTRI_AI", "PRO"];

export function UpgradePaywallModal({ open, onClose, context, onGoBilling }: UpgradePaywallModalProps) {
  const { t } = useLanguage();

  const bullets =
    context === "nutrition"
      ? [t("today.paywallNutritionBullet1"), t("today.paywallNutritionBullet2"), t("today.paywallNutritionBullet3")]
      : [t("today.paywallTrainingBullet1"), t("today.paywallTrainingBullet2"), t("today.paywallTrainingBullet3")];

  return (
    <Modal open={open} onClose={onClose} title={t("today.paywallTitle")} className="today-premium-modal">
      <div className="grid gap-4" data-testid="upgrade-paywall-modal">
        <ul className="m-0 grid gap-2 p-0">
          {bullets.map((bullet) => (
            <li key={bullet} className="list-none rounded-2xl border px-3 py-2 text-sm text-slate-200" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              • {bullet}
            </li>
          ))}
        </ul>

        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300">{t("today.paywallPlansLabel")}</p>
          <p className="mt-2 text-sm text-slate-300">{PLAN_TIERS.join(" · ")}</p>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onGoBilling} className="min-h-11 sm:order-3" data-testid="upgrade-paywall-go-billing">
            {t("today.paywallPrimaryCta")}
          </Button>
          <Button variant="secondary" onClick={onClose} className="min-h-11 sm:order-2">
            {t("today.paywallSecondaryCta")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
