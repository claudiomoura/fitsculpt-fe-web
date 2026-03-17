import { Button, ButtonLink } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";

type AiTokensExhaustedModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  body: string;
  ctaHref?: string;
  ctaLabel: string;
  closeLabel: string;
};

export function AiTokensExhaustedModal({
  open,
  onClose,
  title,
  description,
  body,
  ctaHref = "/app/settings/billing",
  ctaLabel,
  closeLabel,
}: AiTokensExhaustedModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={(
        <div className="inline-actions-sm">
          <Button variant="secondary" onClick={onClose}>{closeLabel}</Button>
          <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
        </div>
      )}
    >
      <p className="muted m-0">{body}</p>
    </Modal>
  );
}
