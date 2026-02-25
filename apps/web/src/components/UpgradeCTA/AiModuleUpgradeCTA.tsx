import { ButtonLink } from "@/components/ui/Button";

type AiModuleUpgradeCTAProps = {
  title: string;
  description: string;
  buttonLabel: string;
};

export function AiModuleUpgradeCTA({ title, description, buttonLabel }: AiModuleUpgradeCTAProps) {
  return (
    <div className="feature-card mt-12" role="status" aria-live="polite">
      <strong>{title}</strong>
      <p className="muted mt-6">{description}</p>
      <div className="mt-12">
        <ButtonLink href="/app/settings/billing" variant="secondary">
          {buttonLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
