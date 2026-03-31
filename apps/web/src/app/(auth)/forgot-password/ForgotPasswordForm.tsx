"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";

type ForgotPasswordFormProps = {
  action: (formData: FormData) => void;
  labels: {
    email: string;
    emailHelper: string;
    submit: string;
    loading: string;
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

export default function ForgotPasswordForm({ action, labels }: ForgotPasswordFormProps) {
  return (
    <form action={action} className="form-stack">
      <Input
        name="email"
        type="email"
        label={labels.email}
        helperText={labels.emailHelper}
        required
        autoComplete="email"
      />

      <SubmitButton label={labels.submit} loadingLabel={labels.loading} />
    </form>
  );
}
