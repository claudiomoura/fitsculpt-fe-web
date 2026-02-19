import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function ClientHeaderCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton variant="line" style={{ width: "45%" }} />
      </CardHeader>
      <CardContent className="form-stack">
        <Skeleton variant="line" style={{ width: "30%" }} />
        <Skeleton variant="line" style={{ width: "50%" }} />
      </CardContent>
    </Card>
  );
}

export function ClientProfileSummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton variant="line" style={{ width: "40%" }} />
      </CardHeader>
      <CardContent className="form-stack">
        <Skeleton variant="line" style={{ width: "35%" }} />
        <Skeleton variant="line" style={{ width: "35%" }} />
        <Skeleton variant="line" style={{ width: "35%" }} />
      </CardContent>
    </Card>
  );
}

export function ClientRecentActivityCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton variant="line" style={{ width: "55%" }} />
      </CardHeader>
      <CardContent className="form-stack">
        <Skeleton variant="line" style={{ width: "100%" }} />
        <Skeleton variant="line" style={{ width: "80%" }} />
        <Skeleton variant="line" style={{ width: "90%" }} />
      </CardContent>
    </Card>
  );
}

export function NotesPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton variant="line" style={{ width: "35%" }} />
      </CardHeader>
      <CardContent className="form-stack">
        <Skeleton variant="line" style={{ width: "100%" }} />
        <Skeleton variant="line" style={{ width: "85%" }} />
        <Skeleton variant="line" style={{ width: "45%" }} />
      </CardContent>
    </Card>
  );
}
