import type { ComponentProps } from "react";
import { ErrorState as SharedErrorState } from "@/components/states";

export type ErrorStateProps = ComponentProps<typeof SharedErrorState>;

export function ErrorState(props: ErrorStateProps) {
  return <SharedErrorState {...props} />;
}
