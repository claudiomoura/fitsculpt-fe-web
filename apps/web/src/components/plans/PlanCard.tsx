import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";

type PlanCardProps = {
  name: string;
  daysCountSlot?: ReactNode;
  updatedSlot?: ReactNode;
  actionsSlot?: ReactNode;
  selectLabel?: string;
  onClick?: () => void;
  selected?: boolean;
};

export function PlanCard({ name, daysCountSlot, updatedSlot, actionsSlot, selectLabel, onClick, selected = false }: PlanCardProps) {
  return (
    <Card
      className="form-stack"
      style={{ gap: 12, borderColor: selected ? "var(--accent, #0ea5e9)" : undefined }}
      aria-current={selected ? "true" : undefined}
    >
      <CardHeader style={{ paddingBottom: 0 }}>
        <CardTitle style={{ fontSize: 18, margin: 0 }}>{name}</CardTitle>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: 8 }}>
        {daysCountSlot}
        {updatedSlot}
      </CardContent>
      <CardFooter style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        {onClick && selectLabel ? (
          <Button variant="secondary" onClick={onClick} type="button" size="sm">
            {selectLabel}
          </Button>
        ) : null}
        {actionsSlot}
      </CardFooter>
    </Card>
  );
}
