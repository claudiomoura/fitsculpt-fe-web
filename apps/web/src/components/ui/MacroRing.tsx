import { cn } from "@/lib/classNames";

type MacroRingSegment = {
  key: string;
  label: string;
  grams: number;
  target?: number;
  percent: number;
  color: string;
};

type MacroRingProps = {
  segments: MacroRingSegment[];
  centerValue: string;
  centerLabel: string;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
  className?: string;
  centerClassName?: string;
};

const sizeConfig = {
  sm: { ring: 100, font: "text-lg", label: "text-xs" },
  md: { ring: 140, font: "text-2xl", label: "text-sm" },
  lg: { ring: 180, font: "text-3xl", label: "text-base" },
};

export function MacroRing({ 
  segments, 
  centerValue, 
  centerLabel, 
  size = "md",
  showLegend = true,
  className, 
  centerClassName 
}: MacroRingProps) {
  const config = sizeConfig[size];
  const radius = config.ring / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  
  const totalPercent = segments.reduce((sum, s) => sum + s.percent, 0);
  const gradient = `conic-gradient(from 0deg, ${segments
    .map((segment, index, all) => {
      const start = all.slice(0, index).reduce((sum, item) => sum + item.percent, 0) / totalPercent * 100;
      const finish = start + (segment.percent / totalPercent * 100);
      return `${segment.color} ${start}% ${finish}%`;
    })
    .join(", ")})`;

  return (
    <div className={cn("macro-ring-container", className)}>
      <div 
        className="macro-ring"
        style={{ 
          width: config.ring, 
          height: config.ring,
          background: gradient 
        }}
      >
        <div className={cn("macro-ring-center", centerClassName)}>
          <strong className={config.font}>{centerValue}</strong>
          <span className={config.label}>{centerLabel}</span>
        </div>
      </div>
      
      {showLegend && (
        <div className="macro-ring-legend">
          {segments.map((segment) => (
            <div key={segment.key} className="macro-ring-legend-item">
              <span className="macro-ring-legend-dot" style={{ background: segment.color }} />
              <span className="macro-ring-legend-label">{segment.label}</span>
              <span className="macro-ring-legend-value">{segment.grams}g{segment.target ? ` / ${segment.target}g` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { MacroRingSegment };
