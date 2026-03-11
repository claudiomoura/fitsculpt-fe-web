import type { ReactNode } from "react";
import { V0ScreenShell } from "../layout/V0ScreenShell";

type V0NutritionShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function V0NutritionShell({ title, subtitle, actions, children }: V0NutritionShellProps) {
  return (
    <section className="v0-route-shell v0-route-shell--nutrition">
      <div className="v0-route-shell__container">
        <header className="v0-route-shell__topbar">
          <span aria-hidden="true" className="v0-route-shell__badge">Nutrición</span>
          <h1>{title ?? "Plan nutricional"}</h1>
        </header>
        <V0ScreenShell subtitle={subtitle} actions={actions}>
          {children}
        </V0ScreenShell>
      </div>
    </section>
  );
}
