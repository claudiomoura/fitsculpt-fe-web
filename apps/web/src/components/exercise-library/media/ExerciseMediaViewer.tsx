"use client";

import { useMemo, useState } from "react";
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
  mediaItems?: ExerciseMedia[];
  title?: string;
  description?: string;
  closeLabel: string;
  mediaAlt: string;
  fallbackTitle: string;
  fallbackDescription: string;
  nextLabel?: string;
  previousLabel?: string;
};

export function ExerciseMediaViewer({
  open,
  onClose,
  media,
  mediaItems,
  title,
  description,
  closeLabel,
  mediaAlt,
  fallbackTitle,
  fallbackDescription,
  nextLabel,
  previousLabel,
}: ExerciseMediaViewerProps) {
  const items = useMemo(() => {
    const source = Array.isArray(mediaItems) && mediaItems.length > 0 ? mediaItems : media ? [media] : [];
    const unique: ExerciseMedia[] = [];
    const seen = new Set<string>();

    for (const item of source) {
      const key = `${item.kind}:${item.url}`;
      if (!item.url || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    return unique;
  }, [media, mediaItems]);
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedIndex = activeIndex < items.length ? activeIndex : 0;
  const activeMedia = items[resolvedIndex] ?? null;
  const hasCarousel = items.length > 1;
  const mediaKey = `${open ? "open" : "closed"}-${activeMedia?.kind ?? "none"}-${activeMedia?.url ?? "none"}`;

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
          {hasCarousel ? (
            <>
              <Button variant="ghost" onClick={() => setActiveIndex((prev) => (prev - 1 + items.length) % Math.max(items.length, 1))}>
                {previousLabel ?? "Previous"}
              </Button>
              <Button variant="ghost" onClick={() => setActiveIndex((prev) => (prev + 1) % Math.max(items.length, 1))}>
                {nextLabel ?? "Next"}
              </Button>
            </>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      }
    >
      <div className="exercise-media-modal-body">
        <ExerciseMediaContent
          key={mediaKey}
          media={activeMedia}
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
