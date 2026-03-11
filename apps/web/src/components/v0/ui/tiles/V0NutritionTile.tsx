import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";
import { V0Card } from "../V0Card";

type V0NutritionTileProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  rightSlot?: ReactNode;
  footerSlot?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function V0NutritionTile({
  title,
  subtitle,
  rightSlot,
  footerSlot,
  children,
  className,
}: V0NutritionTileProps) {
  return (
    <V0Card className={cn("space-y-4", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white md:text-lg">{title ?? "Nutrición"}</h3>
          {subtitle ? <p className="mt-1 text-sm text-white/65">{subtitle}</p> : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </header>
      {children ? <div className="space-y-3">{children}</div> : null}
      {footerSlot ? <footer>{footerSlot}</footer> : null}
    </V0Card>
  );
}

export type { V0NutritionTileProps };
