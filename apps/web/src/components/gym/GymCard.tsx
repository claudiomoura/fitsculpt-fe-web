import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { MembershipStatusBadge } from "@/components/gym/MembershipStatusBadge";

type MembershipStatus = "PENDING" | "ACTIVE" | "NONE" | "REJECTED" | "UNKNOWN";

type GymCardProps = {
  id: string;
  name: string;
  isSelected: boolean;
  disabled: boolean;
  membershipStatus: MembershipStatus;
  onSelect: (id: string) => void;
  onRequestJoin: () => void;
  statusLabels: {
    pending: string;
    active: string;
    fallback: string;
  };
  selectLabel: string;
  requestLabel: string;
  pendingRequestLabel: string;
  requestDisabled?: boolean;
};

export function GymCard({
  id,
  name,
  isSelected,
  disabled,
  membershipStatus,
  onSelect,
  onRequestJoin,
  statusLabels,
  selectLabel,
  requestLabel,
  pendingRequestLabel,
  requestDisabled = false,
}: GymCardProps) {
  const isPending = membershipStatus === "PENDING";

  return (
    <Card>
      <CardHeader className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <CardTitle>{name}</CardTitle>
        <MembershipStatusBadge status={membershipStatus} pendingLabel={statusLabels.pending} activeLabel={statusLabels.active} unknownLabel={statusLabels.fallback} />
      </CardHeader>
      <CardContent>
        <p className="muted">{id}</p>
      </CardContent>
      <CardFooter className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => onSelect(id)} disabled={disabled || isSelected}>
          {selectLabel}
        </Button>
        <Button onClick={onRequestJoin} disabled={requestDisabled || !isSelected || isPending}>
          {isPending ? pendingRequestLabel : requestLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
