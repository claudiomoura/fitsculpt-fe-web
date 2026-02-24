import { PeriodizationTimeline } from "@/design-system";

type PeriodizationItem = {
  id: string;
  label: string;
  weeks: number;
  intensity: "low" | "medium" | "high" | "deload";
  selected?: boolean;
};

type PeriodizationProps = {
  phases: PeriodizationItem[];
};

export function Periodization({ phases }: PeriodizationProps) {
  return (
    <section aria-label="Periodización">
      <PeriodizationTimeline phases={phases} />
    </section>
  );
}
