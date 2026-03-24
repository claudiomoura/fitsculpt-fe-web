"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ViewTab = "resumen" | "entreno" | "nutricion" | "progreso";

type TodayViewTabsProps = {
  activeView?: ViewTab;
  className?: string;
};

/**
 * TodayViewTabs - 4 pill tabs for view switching
 * 
 * Pills: Resumen (220px), Entreno (190px), Nutrición (200px), Progreso (220px)
 * Height: 76px, Gap: 20px
 * Active: filled dark, Inactive: translucent with border
 */
export function TodayViewTabs({ className }: TodayViewTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = (searchParams.get("view") as ViewTab) || "resumen";

  const tabs: { id: ViewTab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "entreno", label: "Entreno" },
    { id: "nutricion", label: "Nutrición" },
    { id: "progreso", label: "Progreso" },
  ];

  const handleTabClick = (tabId: ViewTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", tabId);
    router.push(`?${params.toString()}`);
  };

  return (
    <nav
      className={className}
      style={{
        display: "flex",
        gap: "clamp(8px, 2vw, 20px)",
        height: "clamp(44px, 10vw, 76px)",
        alignItems: "center",
        justifyContent: "flex-start",
        flexWrap: "wrap",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            style={{
              flex: "1 1 clamp(70px, 20vw, 220px)",
              minWidth: "70px",
              height: "clamp(36px, 8vw, 52px)",
              borderRadius: "26px",
              border: isActive ? "none" : "2px solid rgba(255, 255, 255, 0.2)",
              background: isActive
                ? "linear-gradient(135deg, #0E5A68 0%, #0E4266 100%)"
                : "rgba(14, 66, 102, 0.3)",
              color: isActive ? "#fff" : "rgba(255, 255, 255, 0.7)",
              fontSize: "clamp(12px, 2.5vw, 18px)",
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              backdropFilter: isActive ? "none" : "blur(8px)",
              boxShadow: isActive
                ? "0 4px 16px rgba(0, 180, 160, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
                : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
