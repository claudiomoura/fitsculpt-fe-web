import { Button } from "@/components/ui/Button";

type TodayErrorStateProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

export function TodayErrorState({ message, retryLabel, onRetry }: TodayErrorStateProps) {
  return (
    <section className="rounded-xl border border-danger/40 bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--bg-panel))] p-4" data-testid="today-wow-error">
      <p className="m-0 text-sm text-text">{message}</p>
      <Button className="mt-3" size="lg" variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </section>
  );
}
