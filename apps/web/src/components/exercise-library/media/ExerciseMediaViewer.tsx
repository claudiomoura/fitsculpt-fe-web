"use client";

import { useState } from "react";
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
  const mediaKey = `${open ? "open" : "closed"}-${media?.kind ?? "none"}-${media?.url ?? "none"}`;

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
        <ExerciseMediaContent
          key={mediaKey}
          media={media}
          mediaAlt={mediaAlt}
          fallbackTitle={fallbackTitle}
          fallbackDescription={fallbackDescription}
        />
      </div>
    </Modal>
  );
}

function ExerciseMediaContent({
  media,
  mediaAlt,
  fallbackTitle,
  fallbackDescription,
}: {
  media: ExerciseMedia | null;
  mediaAlt: string;
  fallbackTitle: string;
  fallbackDescription: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!media || hasError) {
    return (
      <div className="exercise-media-fallback">
        <Icon name="warning" />
        <div>
          <h3 className="m-0">{fallbackTitle}</h3>
          <p className="muted">{fallbackDescription}</p>
        </div>
      </div>
    );
  }

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
}
