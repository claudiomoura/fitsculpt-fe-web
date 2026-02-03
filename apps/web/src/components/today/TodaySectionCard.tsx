import type { ReactNode } from "react";

type TodaySectionCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function TodaySectionCard({ title, subtitle, action, children }: TodaySectionCardProps) {
  return (
    <section className="card">
      <div className="section-head section-head--card">
        <div>
          <h2 className="section-title section-title-sm">{title}</h2>
          {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="section-actions">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
