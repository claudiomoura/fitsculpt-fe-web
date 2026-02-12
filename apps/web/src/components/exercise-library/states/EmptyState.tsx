import type { ComponentProps } from "react";
import { EmptyState as SharedEmptyState } from "@/components/states";

export type EmptyStateProps = ComponentProps<typeof SharedEmptyState>;

export function EmptyState(props: EmptyStateProps) {
  return <SharedEmptyState {...props} />;
}
