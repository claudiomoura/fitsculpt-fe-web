"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/classNames";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({ open, title, description, onClose, children, footer, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <div className={cn("ui-modal-card", className)} role="dialog" aria-modal="true">
        {(title || description) && (
          <div className="ui-modal-header">
            <div>
              {title ? <div className="ui-modal-title">{title}</div> : null}
              {description ? <p className="ui-modal-description">{description}</p> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              ×
            </Button>
          </div>
        )}
        {children}
        {footer ? <div className="ui-card-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
