import type { ReactNode } from "react";

type AppLayoutProps = {
  main: ReactNode;
  rightPanel?: ReactNode;
  className?: string;
};

export default function AppLayout({ main, rightPanel, className }: AppLayoutProps) {
  return (
    <div className={`desktop-app-layout ${className ?? ""}`.trim()}>
      <div className="desktop-app-layout-main">{main}</div>
      {rightPanel ? <aside className="desktop-app-layout-right">{rightPanel}</aside> : null}
    </div>
  );
}
