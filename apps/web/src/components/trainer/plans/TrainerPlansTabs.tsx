"use client";

import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { useLanguage } from "@/context/LanguageProvider";

type TrainerPlansTabId = "fitsculptPlans" | "myPlans";

type TrainerPlansTabsProps = {
  selectedTab: TrainerPlansTabId;
  onChange: (tab: TrainerPlansTabId) => void;
};

export default function TrainerPlansTabs({ selectedTab, onChange }: TrainerPlansTabsProps) {
  const { t } = useLanguage();

  return (
    <SegmentedControl
      ariaLabel={t("trainer.plans.tabs.ariaLabel")}
      options={[
        { id: "fitsculptPlans", label: t("trainer.plans.tabs.fitsculptPlans") },
        { id: "myPlans", label: t("trainer.plans.tabs.myPlans") },
      ]}
      value={selectedTab}
      onChange={(nextValue) => onChange(nextValue as TrainerPlansTabId)}
    />
  );
}
