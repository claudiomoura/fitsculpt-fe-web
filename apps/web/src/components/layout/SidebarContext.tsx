"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type SidebarContextValue = {
  isCollapsed: boolean;
  isMobile: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const saved = window.localStorage.getItem("sidebar-collapsed");
    return saved !== null ? JSON.parse(saved) : false;
  });
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const isMobile = !isLargeScreen;
  const effectiveCollapsed = isMobile ? true : isCollapsed;

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  const toggle = useCallback(() => {
    if (isMobile) return;
    setIsCollapsed((prev: boolean) => !prev);
  }, [isMobile]);

  const setCollapsed = useCallback((collapsed: boolean) => {
    if (isMobile) return;
    setIsCollapsed(collapsed);
  }, [isMobile]);

  return (
    <SidebarContext.Provider value={{ isCollapsed: effectiveCollapsed, isMobile, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}
