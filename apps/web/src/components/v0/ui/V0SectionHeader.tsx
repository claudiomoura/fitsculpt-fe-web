import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";

type V0SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function V0SectionHeader({
  title,
  subtitle,
  actions,
  className,
  contentClassName,
}: V0SectionHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 md:gap-5",
        className,
      )}
    >
      <div className={cn("min-w-0", contentClassName)}>
        <h2 className="text-lg font-semibold tracking-[var(--v0-title-tracking)] text-white md:text-[1.6rem]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1.5 text-[var(--v0-subtitle-size)] leading-relaxed text-white/70">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
