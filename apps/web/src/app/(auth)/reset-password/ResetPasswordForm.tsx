"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";

type ResetPasswordFormProps = {
  action: (formData: FormData) => void;
  token: string;
  labels: {
    password: string;
    passwordHelper: string;
    confirmPassword: string;
    submit: string;
    loading: string;
    showPassword: string;
    hidePassword: string;
    passwordMismatch: string;
  };
};

function SubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="fit-content">
      {pending ? loadingLabel : label}
    </Button>
  );
}

export default function ResetPasswordForm({ action, token, labels }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value;

    if (password !== confirm) {
      setMismatch(true);
      e.preventDefault();
      return;
    }
    setMismatch(false);
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="form-stack">
      <input type="hidden" name="token" value={token} />

      <div className="ui-input-field">
        <label className="ui-input-label" htmlFor="reset-password">
          {labels.password}
        </label>
        <div className="input-with-action">
          <input
            id="reset-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="ui-input"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="input-action"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? labels.hidePassword : labels.showPassword}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
        <span className="ui-input-helper">{labels.passwordHelper}</span>
      </div>

      <div className="ui-input-field">
        <label className="ui-input-label" htmlFor="reset-confirm-password">
          {labels.confirmPassword}
        </label>
        <div className="input-with-action">
          <input
            id="reset-confirm-password"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            className="ui-input"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="input-action"
            onClick={() => setShowConfirm((prev) => !prev)}
            aria-label={showConfirm ? labels.hidePassword : labels.showPassword}
          >
            {showConfirm ? "🙈" : "👁️"}
          </button>
        </div>
        {mismatch && (
          <span className="ui-input-helper" style={{ color: "#ef4444" }}>
            {labels.passwordMismatch}
          </span>
        )}
      </div>

      <SubmitButton label={labels.submit} loadingLabel={labels.loading} />
    </form>
  );
}
