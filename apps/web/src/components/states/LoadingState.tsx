import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/classNames";

type LoadingStateProps = {
  title?: string;
  lines?: number;
  showCard?: boolean;
  className?: string;
  cardClassName?: string;
  ariaLabel: string;
};

export function LoadingState({
  title,
  lines = 3,
  showCard = true,
  className,
  cardClassName,
  ariaLabel,
}: LoadingStateProps) {
  const content = (
    <section className={cn("form-stack", className)} role="status" aria-live="polite" aria-label={ariaLabel}>
      {title ? <h2 className="m-0">{title}</h2> : null}
      <Skeleton variant="line" className="w-70" />
      <Skeleton variant="line" className="w-45" />
      {Array.from({ length: Math.max(lines, 1) }).map((_, index) => (
        <Skeleton key={`loading-line-${index}`} variant="line" className={index % 2 === 0 ? "w-80" : "w-55"} />
      ))}
    </section>
  );

  if (!showCard) {
    return content;
  }

  return <Card className={cn("centered-card", cardClassName)}>{content}</Card>;
}
