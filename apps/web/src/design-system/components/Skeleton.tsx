import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

type SkeletonVariant = "block" | "line";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
};

export function Skeleton({ variant = "block", className, ...props }: SkeletonProps) {
  return <div className={cn("ui-skeleton", variant === "line" ? "ui-skeleton--line" : "ui-skeleton--block", className)} {...props} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("ui-skeleton-card", className)}>
      <Skeleton variant="line" style={{ width: "60%" }} />
      <Skeleton variant="line" style={{ width: "80%" }} />
      <Skeleton variant="line" style={{ width: "40%" }} />
    </div>
  );
}
