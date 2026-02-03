"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

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
  fallbackTitle: string;
  fallbackDescription: string;
};

export function ExerciseMediaViewer({
  open,
  onClose,
  media,
  title,
  description,
  closeLabel,
  mediaAlt,
  fallbackTitle,
  fallbackDescription,
}: ExerciseMediaViewerProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [open, media]);

  const content = useMemo(() => {
    if (!media) return null;
    if (media.kind === "video") {
      return (
        <video
          className="exercise-media-viewer"
          controls
          playsInline
          poster={media.poster}
          onError={() => setHasError(true)}
        >
          <source src={media.url} />
        </video>
      );
    }

    return (
      <img
        className="exercise-media-viewer"
        src={media.url}
        alt={mediaAlt}
        onError={() => setHasError(true)}
      />
    );
  }, [media, mediaAlt]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className="exercise-media-modal"
      overlayClassName="exercise-media-overlay"
      footer={
        <div className="inline-actions">
          <Button variant="secondary" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      }
    >
      <div className="exercise-media-modal-body">
        {hasError || !content ? (
          <div className="exercise-media-fallback">
            <Icon name="warning" />
            <div>
              <h3 className="m-0">{fallbackTitle}</h3>
              <p className="muted">{fallbackDescription}</p>
            </div>
          </div>
        ) : (
          content
        )}
      </div>
    </Modal>
  );
}
