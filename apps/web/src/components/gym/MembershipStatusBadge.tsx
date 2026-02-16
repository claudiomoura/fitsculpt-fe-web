import { Badge } from "@/components/ui/Badge";

type MembershipStatus = "PENDING" | "ACTIVE" | "NONE" | "REJECTED" | "UNKNOWN";

type MembershipStatusBadgeProps = {
  status: MembershipStatus;
  pendingLabel: string;
  activeLabel: string;
  unknownLabel: string;
};

export function MembershipStatusBadge({ status, pendingLabel, activeLabel, unknownLabel }: MembershipStatusBadgeProps) {
  if (status === "PENDING") {
    return <Badge variant="warning">{pendingLabel}</Badge>;
  }

  if (status === "ACTIVE") {
    return <Badge variant="success">{activeLabel}</Badge>;
  }

  return <Badge variant="muted">{unknownLabel}</Badge>;
}
