"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/classNames";

import { elevation } from "../elevation";
import { createTransition } from "../motion";
import { WorkoutProgressBar } from "./WorkoutProgressBar";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";

export type ExerciseCardCompactProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  name: ReactNode;
  detail?: ReactNode;
  volume?: ReactNode;
  imageSrc?: string | null;
  imageAlt: string;
  progress?: number;
};

export function ExerciseCardCompact({ name, detail, volume, imageSrc, imageAlt, progress, className, ...props }: ExerciseCardCompactProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left",
        "hover:-translate-y-px active:scale-[0.98]",
        className,
      )}
      style={{ boxShadow: elevation.sm, transition: createTransition("interactive") }}
      {...props}
    >
      <ExerciseThumbnail
        src={imageSrc}
        alt={imageAlt}
        width={80}
        height={80}
        className="h-20 w-20 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold text-text">{name}</p>
        {detail ? <p className="m-0 mt-1 truncate text-xs text-text-muted">{detail}</p> : null}
        {volume ? <p className="m-0 mt-1.5 text-xs font-medium text-primary">{volume}</p> : null}
        {typeof progress === "number" ? <WorkoutProgressBar className="mt-2" value={progress} max={100} /> : null}
      </div>
      <span className="text-text-muted" aria-hidden>
        ›
      </span>
    </button>
  );
}
