import type { ReactNode } from "react";
import { V0ScreenShell } from "../layout/V0ScreenShell";

type V0ProfileShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function V0ProfileShell({ title, subtitle, actions, children }: V0ProfileShellProps) {
  return (
    <V0ScreenShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </V0ScreenShell>
  );
}
