'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/classNames';

export type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
  labelledBy?: string;
  describedBy?: string;
};

export function ModalShell({
  open,
  onClose,
  children,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
  labelledBy,
  describedBy,
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-bg/75 p-4 backdrop-blur-sm', overlayClassName)}
      role="presentation"
      onMouseDown={(event) => {
        if (!closeOnOverlayClick) {
          return;
        }

        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div
        className={cn('w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-lg', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
