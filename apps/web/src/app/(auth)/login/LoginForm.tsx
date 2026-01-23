"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type LoginFormProps = {
  action: (formData: FormData) => void;
  next: string;
  labels: {
    email: string;
    password: string;
    submit: string;
    loading: string;
    showPassword: string;
    hidePassword: string;
  };
};

function SubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn ${pending ? "is-loading" : ""}`} disabled={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default function LoginForm({ action, next, labels }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="next" value={next} />

      <label className="form-stack">
        {labels.email}
        <input name="email" type="email" required />
      </label>

      <label className="form-stack">
        {labels.password}
        <div className="input-with-action">
          <input name="password" type={showPassword ? "text" : "password"} required />
          <button
            type="button"
            className="input-action"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? labels.hidePassword : labels.showPassword}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </label>

      <SubmitButton label={labels.submit} loadingLabel={labels.loading} />
    </form>
  );
}
