import type { ComponentProps } from "react";
import type { IconName } from "@/components/ui/Icon";
import { EmptyState } from "./EmptyState";

type EmptyStateAction = NonNullable<ComponentProps<typeof EmptyState>["actions"]>[number];

type ErrorStateProps = {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  icon?: IconName;
  className?: string;
  wrapInCard?: boolean;
  cardClassName?: string;
  ariaLabel?: string;
  actions?: EmptyStateAction[];
};

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  retryDisabled,
  icon = "warning",
  className,
  wrapInCard = false,
  cardClassName,
  ariaLabel,
  actions,
}: ErrorStateProps) {
  const retryAction = onRetry && retryLabel ? [{ label: retryLabel, onClick: onRetry, variant: "secondary" as const, disabled: retryDisabled }] : [];

  return (
    <EmptyState
      title={title}
      description={description}
      icon={icon}
      className={className}
      wrapInCard={wrapInCard}
      cardClassName={cardClassName}
      ariaLabel={ariaLabel}
      actions={[...(actions ?? []), ...retryAction]}
    />
  );
}
