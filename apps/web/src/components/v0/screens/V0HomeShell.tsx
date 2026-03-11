import type { ReactNode } from "react";
import { V0ScreenShell } from "../layout/V0ScreenShell";

type V0HomeShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function V0HomeShell({ title, subtitle, actions, children }: V0HomeShellProps) {
  return (
    <section className="v0-route-shell v0-route-shell--home">
      <div className="v0-route-shell__container">
        <header className="v0-route-shell__topbar">
          <span aria-hidden="true" className="v0-route-shell__badge">Inicio</span>
          <h1>{title ?? "Resumen de hoy"}</h1>
        </header>
        <V0ScreenShell subtitle={subtitle} actions={actions}>
          {children}
        </V0ScreenShell>
      </div>
    </section>
  );
}
