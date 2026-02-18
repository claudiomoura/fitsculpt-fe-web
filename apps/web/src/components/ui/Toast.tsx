"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/classNames";

type ToastVariant = "success" | "warning" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  notify: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ToastProvider({ children, duration = 4000 }: { children: ReactNode; duration?: number }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = createId();
      const item: ToastItem = { id, ...toast };
      setToasts((prev) => [...prev, item]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((entry) => entry.id !== id));
      }, duration);
    },
    [duration]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-viewport" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn("ui-toast", toast.variant && `ui-toast--${toast.variant}`)}>
            <Button
              variant="ghost"
              size="sm"
              className="ui-toast-close"
              aria-label="Close"
              onClick={() => setToasts((prev) => prev.filter((entry) => entry.id !== toast.id))}
            >
              ×
            </Button>
            <div className="ui-toast-title">{toast.title}</div>
            {toast.description ? <div className="ui-toast-description">{toast.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
