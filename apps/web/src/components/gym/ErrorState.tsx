import { Button } from "@/design-system/components/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/design-system/components/Card";

type ErrorStateProps = {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
};

export function ErrorState({ title, description, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
