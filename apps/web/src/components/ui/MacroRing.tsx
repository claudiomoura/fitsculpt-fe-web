import { cn } from "@/lib/classNames";

type MacroRingSegment = {
  key: string;
  label: string;
  grams: number;
  percent: number;
  color: string;
};

type MacroRingProps = {
  segments: MacroRingSegment[];
  centerValue: string;
  centerLabel: string;
  className?: string;
  centerClassName?: string;
};

export function MacroRing({ segments, centerValue, centerLabel, className, centerClassName }: MacroRingProps) {
  const gradient = `conic-gradient(${segments
    .map((segment, index, all) => {
      const start = all.slice(0, index).reduce((sum, item) => sum + item.percent, 0);
      const finish = start + segment.percent;
      return `${segment.color} ${start}% ${finish}%`;
    })
    .join(", ")})`;

  return (
    <div className={cn("nutrition-macro-ring", className)} style={{ background: gradient }}>
      <div className={cn("nutrition-macro-ring-center", centerClassName)}>
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

export type { MacroRingSegment };
