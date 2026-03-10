"use client"

import { AlertCircle, Loader2, Check } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"

// Loading Skeleton
export function CardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-muted" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-2/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="h-10 w-24 bg-muted rounded-xl" />
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// Empty State
interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="rounded-xl glow-primary">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

// Error State
interface ErrorStateProps {
  message?: string
  onRetry: () => void
}

export function ErrorState({ message = "No se pudo cargar la informacion.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
        <AlertCircle className="w-10 h-10 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Algo salio mal</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">{message}</p>
      <Button onClick={onRetry} variant="outline" className="rounded-xl border-border">
        Reintentar
      </Button>
    </div>
  )
}

// Success Toast
interface SuccessToastProps {
  message: string
  isVisible: boolean
}

export function SuccessToast({ message, isVisible }: SuccessToastProps) {
  if (!isVisible) return null
  
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="glass-card px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 glow-accent">
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
          <Check className="w-4 h-4 text-accent-foreground" strokeWidth={3} />
        </div>
        <span className="text-sm font-medium text-foreground">{message}</span>
      </div>
    </div>
  )
}

// Loading Spinner
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div className="absolute inset-0 w-10 h-10 rounded-full glow-primary opacity-50" />
      </div>
    </div>
  )
}

// Progress Ring (reusable)
interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: "primary" | "accent"
  showLabel?: boolean
  label?: string
  sublabel?: string
}

export function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 8, 
  color = "primary",
  showLabel = false,
  label,
  sublabel
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="progress-ring">
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={color === "accent" ? "text-accent" : "text-primary"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && <span className="text-lg font-bold text-foreground">{label}</span>}
          {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
        </div>
      )}
    </div>
  )
}
