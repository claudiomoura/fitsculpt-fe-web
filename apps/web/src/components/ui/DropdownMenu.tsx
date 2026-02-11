"use client";

/* eslint-disable react-hooks/refs */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/classNames";

type DropdownContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  triggerEl: HTMLButtonElement | null;
  contentEl: HTMLDivElement | null;
  setTriggerEl: (value: HTMLButtonElement | null) => void;
  setContentEl: (value: HTMLDivElement | null) => void;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (contentEl?.contains(target) || triggerEl?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerEl, contentEl, setTriggerEl, setContentEl }}>
      <div className="ui-dropdown">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const context = useDropdownContext();
  return (
    <button
      type="button"
      className={cn("ui-button ui-button--ghost", className)}
      aria-haspopup="menu"
      aria-expanded={context.open}
      onClick={() => context.setOpen(!context.open)}
      ref={context.setTriggerEl}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, className }: { children: ReactNode; className?: string }) {
  const context = useDropdownContext();
  if (!context.open) return null;
  return (
    <div className={cn("ui-dropdown-content", className)} role="menu" ref={context.setContentEl}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  disabled,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const context = useDropdownContext();
  return (
    <button
      type="button"
      className={cn("ui-dropdown-item", className)}
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        context.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="ui-dropdown-separator" role="separator" />;
}

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenu components must be used inside DropdownMenu");
  return context;
}
