import type { ReactNode } from "react";
import { ProHeader } from "@/design-system/components";

type V0ScreenShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function V0ScreenShell({
  title,
  subtitle,
  actions,
  children,
}: V0ScreenShellProps) {
  return (
    <section className="ui-card form-stack">
      {title ? (
        <ProHeader
          title={title}
          subtitle={subtitle}
          actions={actions}
          compact
          className="border-b-0 pb-0"
        />
      ) : null}
      {children}
    </section>
  );
}
