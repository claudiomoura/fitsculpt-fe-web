import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

type InputVariant = "default" | "premium";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  variant?: InputVariant;
};

export function Input({ label, helperText, errorText, variant = "default", id, className, ...props }: InputProps) {
  const inputId = useId();
  const resolvedId = id ?? inputId;
  const helperId = helperText ? `${resolvedId}-helper` : undefined;
  const errorId = errorText ? `${resolvedId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const isPremium = variant === "premium";

  return (
    <div className={cn("ui-input-field", isPremium && "ui-input-field--premium")}>
      {label ? (
        <label className={cn("ui-input-label", isPremium && "ui-input-label--premium")} htmlFor={resolvedId}>
          {label}
        </label>
      ) : null}
      <input
        id={resolvedId}
        className={cn("ui-input", errorText && "is-error", isPremium && "ui-input--premium", className)}
        aria-invalid={Boolean(errorText) || undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {helperText ? (
        <span className={cn("ui-input-helper", isPremium && "ui-input-helper--premium")} id={helperId}>
          {helperText}
        </span>
      ) : null}
      {errorText ? (
        <span className={cn("ui-input-error", isPremium && "ui-input-error--premium")} id={errorId}>
          {errorText}
        </span>
      ) : null}
    </div>
  );
}
