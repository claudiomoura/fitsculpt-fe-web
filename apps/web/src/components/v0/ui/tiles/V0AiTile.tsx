import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";
import { V0Card } from "../V0Card";

export type V0AiTileProps = {
  label?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  cta?: ReactNode;
  footerSlot?: ReactNode;
  className?: string;
};

export function V0AiTile({
  label,
  icon,
  title,
  meta,
  cta,
  footerSlot,
  className,
}: V0AiTileProps) {
  return (
    <V0Card className={cn("space-y-4", className)}>
      <header className="flex items-center gap-2 text-white/75">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/90">
          {icon ?? "✨"}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
          {label ?? "Coach IA"}
        </p>
      </header>

      <h3 className="text-lg font-semibold leading-tight text-white md:text-xl">
        {title ?? "Sugestão inteligente"}
      </h3>

      <div className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white/75">
        {meta ?? "Pergunte algo para começar."}
      </div>

      {cta ? <footer className="pt-1">{cta}</footer> : null}
      {footerSlot ? <div>{footerSlot}</div> : null}
    </V0Card>
  );
}
