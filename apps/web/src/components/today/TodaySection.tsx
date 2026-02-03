import type { ReactNode } from "react";
import { TodaySectionCard } from "@/components/today/TodaySectionCard";

type TodaySectionStatus = "loading" | "error" | "empty" | "ready";

type TodaySectionProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  status: TodaySectionStatus;
  loading: ReactNode;
  empty: ReactNode;
  error: ReactNode;
  children: ReactNode;
};

export function TodaySection({
  title,
  subtitle,
  action,
  status,
  loading,
  empty,
  error,
  children,
}: TodaySectionProps) {
  return (
    <TodaySectionCard title={title} subtitle={subtitle} action={action}>
      {status === "loading" ? loading : status === "error" ? error : status === "empty" ? empty : children}
    </TodaySectionCard>
  );
}

export type { TodaySectionStatus };
