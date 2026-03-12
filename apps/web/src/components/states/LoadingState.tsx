import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/classNames";

type LoadingStateVariant = "default" | "premium" | "inline";

type LoadingStateProps = {
  title?: string;
  lines?: number;
  showCard?: boolean;
  className?: string;
  cardClassName?: string;
  ariaLabel: string;
  variant?: LoadingStateVariant;
};

export function LoadingState({
  title,
  lines = 3,
  showCard = true,
  className,
  cardClassName,
  ariaLabel,
  variant = "default",
}: LoadingStateProps) {
  const isPremium = variant === "premium";
  const isInline = variant === "inline";

  const content = (
    <section
      className={cn(
        "form-stack",
        isPremium && "loading-state--premium",
        isInline && "loading-state--inline",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {title ? <h2 className={cn("m-0", isPremium && "loading-title--premium")}>{title}</h2> : null}
      {!isInline && <Skeleton variant="line" className="w-70" />}
      {!isInline && <Skeleton variant="line" className="w-45" />}
      {Array.from({ length: Math.max(lines, 1) }).map((_, index) => (
        <Skeleton
          key={`loading-line-${index}`}
          variant="line"
          className={cn(isPremium && "skeleton--premium", index % 2 === 0 ? "w-80" : "w-55")}
        />
      ))}
    </section>
  );

  if (!showCard) {
    return content;
  }

  return <Card className={cn("centered-card", cardClassName)}>{content}</Card>;
}
