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
    <V0ScreenShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </V0ScreenShell>
  );
}
