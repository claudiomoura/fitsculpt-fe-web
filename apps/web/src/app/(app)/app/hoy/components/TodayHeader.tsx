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
      <h1 className="today-page-title">
        Buenos días<span className="text-accent">, {userName}</span>
      </h1>
      <p className="today-label" style={{ marginTop: "8px", opacity: 0.7 }}>
        Tu resumen de hoy
      </p>
    </header>
  );
}
