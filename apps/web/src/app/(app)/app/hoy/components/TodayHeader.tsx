"use client";

type TodayHeaderProps = {
  userName?: string;
  className?: string;
};

/**
 * TodayHeader - Page header with greeting and user name
 * 
 * Displays "Buenos días" greeting with user name and subtitle
 * Uses premium typography from Phase 1 CSS variables
 */
export function TodayHeader({ userName = "Usuario", className }: TodayHeaderProps) {
  return (
    <header className={className}>
      <h1 className="text-2xl font-bold tracking-tight text-primary">
        Buenos días<span className="text-accent">, {userName}</span>
      </h1>
      <p className="mt-1 text-sm text-muted">
        Tu resumen de hoy
      </p>
    </header>
  );
}
