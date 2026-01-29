"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type RegisterFormProps = {
  action: (formData: FormData) => void;
  labels: {
    name: string;
    nameHelper: string;
    email: string;
    emailHelper: string;
    password: string;
    passwordHelper: string;
    promoCode: string;
    promoHelper: string;
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

export default function RegisterForm({ action, labels }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="form-stack">
      <Input
        name="name"
        type="text"
        label={labels.name}
        helperText={labels.nameHelper}
        autoComplete="name"
      />

      <Input
        name="email"
        type="email"
        label={labels.email}
        helperText={labels.emailHelper}
        required
        autoComplete="email"
      />

      <div className="ui-input-field">
        <label className="ui-input-label" htmlFor="register-password">
          {labels.password}
        </label>
        <div className="input-with-action">
          <input
            id="register-password"
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

      <Input
        name="promoCode"
        type="text"
        label={labels.promoCode}
        helperText={labels.promoHelper}
        required
      />

      <SubmitButton label={labels.submit} loadingLabel={labels.loading} />
    </form>
  );
}
