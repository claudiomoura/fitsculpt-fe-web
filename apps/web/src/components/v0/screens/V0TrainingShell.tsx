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
    <V0ScreenShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </V0ScreenShell>
  );
}
