import { MacroRing, type MacroRingSegment } from "@/components/ui/MacroRing";

type HeroNutritionProps = {
  title: string;
  calories: number;
  segments: MacroRingSegment[];
};

export function HeroNutrition({ title, calories, segments }: HeroNutritionProps) {
  return (
    <div className="nutrition-v2-hero" aria-label={title}>
      <MacroRing
        segments={segments}
        centerValue={String(Math.round(calories))}
        centerLabel={title}
        className="nutrition-macro-ring--hero"
        centerClassName="nutrition-macro-ring-center--hero"
      />
      <ul className="list-reset nutrition-ring-legend nutrition-ring-legend--compact">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="nutrition-ring-dot" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
            <strong>{Math.round(segment.grams)}g</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
