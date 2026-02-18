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
      className={cn("ui-card", className)}
      style={{
        borderRadius: "18px",
        borderColor: "color-mix(in srgb, var(--border) 72%, #0ea5e9 28%)",
        boxShadow: elevated ? "0 18px 38px rgba(15, 23, 42, 0.12)" : "0 8px 20px rgba(15, 23, 42, 0.08)",
        background: "linear-gradient(160deg, color-mix(in srgb, var(--bg-card) 92%, #ffffff 8%) 0%, color-mix(in srgb, var(--bg-card) 86%, #ecfeff 14%) 100%)",
        ...style,
      }}
      {...props}
    >
      {header ? <div className="ui-card-header">{header}</div> : null}
      <div className="ui-card-content">{children}</div>
      {footer ? <div className="ui-card-footer">{footer}</div> : null}
    </section>
  );
}
