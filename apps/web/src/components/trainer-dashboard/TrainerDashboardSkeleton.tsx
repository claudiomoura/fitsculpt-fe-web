import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function TrainerDashboardSkeleton() {
  return (
    <div className="form-stack" aria-hidden>
      <div className="grid" style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="form-stack" style={{ gap: 8 }}>
              <Skeleton variant="line" style={{ width: "40%" }} />
              <Skeleton variant="line" style={{ width: "60%" }} />
            </CardHeader>
            <CardContent>
              <Skeleton variant="line" style={{ width: "35%" }} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="form-stack" style={{ gap: 8 }}>
          <Skeleton variant="line" style={{ width: "50%" }} />
          <Skeleton variant="line" style={{ width: "75%" }} />
        </CardHeader>
        <CardContent>
          <Skeleton style={{ minHeight: 120 }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="form-stack" style={{ gap: 8 }}>
          <Skeleton variant="line" style={{ width: "40%" }} />
          <Skeleton variant="line" style={{ width: "70%" }} />
        </CardHeader>
        <CardContent>
          <Skeleton style={{ minHeight: 120 }} />
        </CardContent>
      </Card>
    </div>
  );
}
