"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/classNames";

import { elevation } from "../elevation";
import { createTransition } from "../motion";
import { Icon } from "./Icon";
import { WorkoutProgressBar } from "./WorkoutProgressBar";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";

export type ExerciseCardCompactProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "name"> & {
  name: ReactNode;
  detail?: ReactNode;
  volume?: ReactNode;
  imageSrc?: string | null;
  imageAlt: string;
  progress?: number;
  statusLabel?: ReactNode;
  statusState?: "idle" | "done";
  showChevron?: boolean;
};

export function ExerciseCardCompact({
  name,
  detail,
  volume,
  imageSrc,
  imageAlt,
  progress,
  statusLabel,
  statusState = "idle",
  showChevron = false,
  className,
  ...props
}: ExerciseCardCompactProps) {
  const isDone = statusState === "done";

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-surface p-3 text-left",
        "hover:-translate-y-px active:scale-[0.98]",
        className,
      )}
      style={{ boxShadow: elevation.sm, transition: createTransition("interactive") }}
      {...props}
    >
      <ExerciseThumbnail
        src={imageSrc}
        alt={imageAlt}
        width={56}
        height={56}
        className="h-14 w-14 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold text-text">{name}</p>
        {detail ? <p className="m-0 mt-1 truncate text-xs text-text-muted">{detail}</p> : null}
        {volume ? <p className="m-0 mt-1 text-[11px] font-medium text-text-muted">{volume}</p> : null}
        {typeof progress === "number" ? <WorkoutProgressBar className="mt-2" value={progress} max={100} /> : null}
      </div>
      {statusLabel ? (
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: isDone ? "rgba(16,185,129,0.14)" : "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: isDone ? "#10B981" : "var(--primary)",
          }}
        >
          {statusLabel}
        </span>
      ) : null}
      {showChevron ? <Icon name="chevron-right" size={16} className="text-text-muted" /> : null}
    </button>
  );
}
