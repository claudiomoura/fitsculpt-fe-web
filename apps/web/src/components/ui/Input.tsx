import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  errorText?: string;
};

export function Input({ label, helperText, errorText, id, className, ...props }: InputProps) {
  const inputId = useId();
  const resolvedId = id ?? inputId;
  const helperId = helperText ? `${resolvedId}-helper` : undefined;
  const errorId = errorText ? `${resolvedId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="ui-input-field">
      {label ? (
        <label className="ui-input-label" htmlFor={resolvedId}>
          {label}
        </label>
      ) : null}
      <input
        id={resolvedId}
        className={cn("ui-input", errorText && "is-error", className)}
        aria-invalid={Boolean(errorText) || undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {helperText ? (
        <span className="ui-input-helper" id={helperId}>
          {helperText}
        </span>
      ) : null}
      {errorText ? (
        <span className="ui-input-error" id={errorId}>
          {errorText}
        </span>
      ) : null}
    </div>
  );
}
