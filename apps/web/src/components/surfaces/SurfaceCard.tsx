import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/classNames";

type SurfaceCardProps = ComponentPropsWithoutRef<"section"> & {
  header?: ReactNode;
  footer?: ReactNode;
  elevated?: boolean;
};

export function SurfaceCard({ className, header, footer, elevated = true, children, style, ...props }: SurfaceCardProps) {
  return (
    <section
      className={cn("ui-card", !elevated && "surface-card--flat", className)}
      style={style}
      {...props}
    >
      {header ? <div className="ui-card-header">{header}</div> : null}
      <div className="ui-card-content">{children}</div>
      {footer ? <div className="ui-card-footer">{footer}</div> : null}
    </section>
  );
}
