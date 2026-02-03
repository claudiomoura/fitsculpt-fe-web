"use client";

import { useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export type ExerciseMedia = {
  kind: "image" | "video";
  url: string;
  poster?: string;
};

type ExerciseMediaViewerProps = {
  open: boolean;
  onClose: () => void;
  media: ExerciseMedia | null;
  title?: string;
  description?: string;
  closeLabel: string;
  mediaAlt: string;
};

export function ExerciseMediaViewer({
  open,
  onClose,
  media,
  title,
  description,
  closeLabel,
  mediaAlt,
}: ExerciseMediaViewerProps) {
  const content = useMemo(() => {
    if (!media) return null;
    if (media.kind === "video") {
      return (
        <video className="exercise-media-viewer" controls playsInline poster={media.poster}>
          <source src={media.url} />
        </video>
      );
    }

    return <img className="exercise-media-viewer" src={media.url} alt={mediaAlt} />;
  }, [media, mediaAlt]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className="exercise-media-modal"
      footer={
        <div className="inline-actions">
          <Button variant="secondary" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      }
    >
      <div className="exercise-media-modal-body">
        {content}
      </div>
    </Modal>
  );
}
