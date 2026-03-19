import { Button } from "@/design-system/components/Button";

type TodayErrorStateProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

export function TodayErrorState({ message, retryLabel, onRetry }: TodayErrorStateProps) {
  return (
    <section
      className="card premium-surface-card today-inline-state today-inline-state--error"
      data-testid="today-wow-error"
    >
      <p className="m-0 text-sm text-primary">{message}</p>
      <Button className="mt-4" size="lg" variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </section>
  );
}
