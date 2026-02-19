import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/classNames";
import { SurfaceCard } from "@/components/surfaces/SurfaceCard";
import { Skeleton } from "@/components/ui/Skeleton";

type MetricCardProps = ComponentPropsWithoutRef<"section"> & {
  value: ReactNode;
  label: ReactNode;
  align?: "left" | "center";
  accent?: "mint" | "blue";
};

const ACCENT_STYLE: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  mint: "#2dd4bf",
  blue: "#0ea5e9",
};

export function MetricCard({ value, label, align = "left", accent = "mint", className, style, ...props }: MetricCardProps) {
  const alignItems = align === "center" ? "center" : "flex-start";
  const textAlign = align === "center" ? "center" : "left";

  return (
    <SurfaceCard
      className={cn(className)}
      style={{
        padding: "20px",
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          display: "grid",
          gap: "8px",
          alignItems,
          textAlign,
        }}
      >
        <strong
          style={{
            fontSize: "clamp(2rem, 4.6vw, 2.8rem)",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: ACCENT_STYLE[accent],
          }}
        >
          {value}
        </strong>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
      </div>
    </SurfaceCard>
  );
}

type MetricCardSkeletonProps = {
  className?: string;
};

export function MetricCardSkeleton({ className }: MetricCardSkeletonProps) {
  return (
    <SurfaceCard className={className} style={{ padding: "20px" }} aria-hidden="true">
      <div style={{ display: "grid", gap: "10px", maxWidth: "180px" }}>
        <Skeleton style={{ width: "100%", height: "46px", borderRadius: "12px" }} />
        <Skeleton variant="line" style={{ width: "64%", height: "10px" }} />
      </div>
    </SurfaceCard>
  );
}

export function MetricCardSkeletonInline({ className }: MetricCardSkeletonProps) {
  return (
    <div className={cn(className)} aria-hidden="true" style={{ display: "grid", gap: "10px" }}>
      <Skeleton style={{ width: "120px", height: "38px", borderRadius: "10px" }} />
      <Skeleton variant="line" style={{ width: "88px", height: "10px" }} />
    </div>
  );
}
