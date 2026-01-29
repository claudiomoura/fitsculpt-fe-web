"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginFormProps = {
  action: (formData: FormData) => void;
  next: string;
  labels: {
    email: string;
    emailHelper: string;
    password: string;
    passwordHelper: string;
    submit: string;
    loading: string;
    showPassword: string;
    hidePassword: string;
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

export default function LoginForm({ action, next, labels }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="next" value={next} />

      <Input
        name="email"
        type="email"
        label={labels.email}
        helperText={labels.emailHelper}
        required
        autoComplete="email"
      />

      <div className="ui-input-field">
        <label className="ui-input-label" htmlFor="login-password">
          {labels.password}
        </label>
        <div className="input-with-action">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="ui-input"
            required
            autoComplete="current-password"
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

      <SubmitButton label={labels.submit} loadingLabel={labels.loading} />
    </form>
  );
}
