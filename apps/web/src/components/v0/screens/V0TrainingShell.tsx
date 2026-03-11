import type { ReactNode } from "react";
import { V0ScreenShell } from "../layout/V0ScreenShell";

type V0TrainingShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function V0TrainingShell({ title, subtitle, actions, children }: V0TrainingShellProps) {
  return (
    <section className="v0-route-shell v0-route-shell--training">
      <div className="v0-route-shell__container">
        <header className="v0-route-shell__topbar">
          <span aria-hidden="true" className="v0-route-shell__badge">Entrenamiento</span>
          <h1>{title ?? "Plan de entrenamiento"}</h1>
        </header>
        <V0ScreenShell subtitle={subtitle} actions={actions}>
          {children}
        </V0ScreenShell>
      </div>
    </section>
  );
}
