"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/classNames";
import { useLanguage } from "@/context/LanguageProvider";

type TrainerPlansTabId = "fitsculptPlans" | "myPlans";

type TrainerPlansTabsProps = {
  selectedTab: TrainerPlansTabId;
  onChange: (tab: TrainerPlansTabId) => void;
};

export default function TrainerPlansTabs({ selectedTab, onChange }: TrainerPlansTabsProps) {
  const { t } = useLanguage();

  return (
    <div role="tablist" aria-label={t("trainer.plans.tabs.ariaLabel")} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button
        role="tab"
        id="trainer-plans-tab-fitsculpt"
        aria-selected={selectedTab === "fitsculptPlans"}
        aria-controls="trainer-plans-panel-fitsculpt"
        variant={selectedTab === "fitsculptPlans" ? "primary" : "secondary"}
        className={cn(selectedTab === "fitsculptPlans" ? "" : "opacity-90")}
        onClick={() => onChange("fitsculptPlans")}
      >
        {t("trainer.plans.tabs.fitsculptPlans")}
      </Button>
      <Button
        role="tab"
        id="trainer-plans-tab-my"
        aria-selected={selectedTab === "myPlans"}
        aria-controls="trainer-plans-panel-my"
        variant={selectedTab === "myPlans" ? "primary" : "secondary"}
        className={cn(selectedTab === "myPlans" ? "" : "opacity-90")}
        onClick={() => onChange("myPlans")}
      >
        {t("trainer.plans.tabs.myPlans")}
      </Button>
    </div>
  );
}
