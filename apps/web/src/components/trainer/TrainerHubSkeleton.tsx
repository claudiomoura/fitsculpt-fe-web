import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function TrainerHubSkeleton() {
  return (
    <div className="form-stack" aria-hidden>
      <Card>
        <CardHeader className="form-stack" style={{ gap: 8 }}>
          <Skeleton variant="line" style={{ width: "40%" }} />
          <Skeleton variant="line" style={{ width: "70%" }} />
        </CardHeader>
        <CardContent>
          <Skeleton variant="line" style={{ width: "35%" }} />
        </CardContent>
      </Card>

      <div className="grid" style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="form-stack" style={{ gap: 8 }}>
              <Skeleton variant="line" style={{ width: "50%" }} />
              <Skeleton variant="line" style={{ width: "80%" }} />
            </CardHeader>
            <CardContent className="form-stack" style={{ gap: 10 }}>
              <Skeleton variant="line" style={{ width: "40%" }} />
              <Skeleton variant="line" style={{ width: "55%" }} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
