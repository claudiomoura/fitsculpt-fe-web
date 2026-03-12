'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/classNames';

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
  labelledBy?: string;
  describedBy?: string;
};

export function BottomSheet({
  open,
  onClose,
  children,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
  labelledBy,
  describedBy,
}: BottomSheetProps) {
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
      className={cn('fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 backdrop-blur-sm sm:p-4', overlayClassName)}
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
        className={cn(
          'w-full rounded-t-2xl border border-b-0 border-border bg-surface p-5 shadow-lg sm:max-w-lg sm:rounded-2xl sm:border-b',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-subtle sm:hidden" aria-hidden />
        {children}
      </div>
    </div>,
    document.body
  );
}
