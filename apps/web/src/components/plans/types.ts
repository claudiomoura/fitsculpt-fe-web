export type PlanListState = "ready" | "loading" | "error" | "disabled";

export type PlanListItem = {
  id: string;
  name: string;
  daysCount?: number | null;
  updatedAtLabel?: string | null;
  isActive?: boolean;
};

export type PlanDayItem = {
  id: string;
  label: string;
  detail?: string | null;
  isDisabled?: boolean;
};
