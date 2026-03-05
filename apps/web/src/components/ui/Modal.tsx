"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/classNames";
import { useLanguage } from "@/context/LanguageProvider";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  overlayClassName?: string;
};

export function Modal({ open, title, description, onClose, children, footer, className, overlayClassName }: ModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    requestAnimationFrame(() => {
      if (!dialogRef.current) return;
      const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable ?? dialogRef.current).focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn("ui-modal-overlay", overlayClassName)}
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <div className={cn("ui-modal-card", className)} role="dialog" aria-modal="true" ref={dialogRef} tabIndex={-1}>
        {(title || description) && (
          <div className="ui-modal-header">
            <div>
              {title ? <div className="ui-modal-title">{title}</div> : null}
              {description ? <p className="ui-modal-description">{description}</p> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={t("ui.close")}>
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
