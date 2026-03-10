import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";

type SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("section-head", className)}>
      <div className="stack-sm">
        <h2 className="section-title section-title-sm m-0">{title}</h2>
        {subtitle ? <p className="section-subtitle m-0">{subtitle}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}
