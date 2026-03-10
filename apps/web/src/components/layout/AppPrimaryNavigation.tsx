"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/ui-v0/components/fitsculpt/bottom-nav";
import { DesktopSidebar } from "@/components/ui-v0/components/fitsculpt/desktop-sidebar";
import type { TabType } from "@/components/ui-v0/types";

const tabRoutes: Record<TabType, string> = {
  hoy: "/app/hoy",
  home: "/app/hoy",
  entreno: "/app/entrenamiento",
  nutricion: "/app/nutricion",
  progreso: "/app/biblioteca",
  perfil: "/app/profile",
};

function resolveActiveTab(pathname: string | null): TabType {
  if (!pathname) return "hoy";
  if (pathname.startsWith("/app/entrenamiento")) return "entreno";
  if (pathname.startsWith("/app/nutricion")) return "nutricion";
  if (pathname.startsWith("/app/biblioteca")) return "progreso";
  if (pathname.startsWith("/app/profile")) return "perfil";
  return "hoy";
}

export default function AppPrimaryNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = useMemo(() => resolveActiveTab(pathname), [pathname]);

  const onTabChange = (tab: TabType) => {
    const href = tabRoutes[tab] ?? "/app/hoy";
    router.push(href);
  };

  return (
    <>
      <div className="hidden lg:block">
        <DesktopSidebar activeTab={activeTab} onTabChange={onTabChange} onNavigate={() => undefined} showTools={false} />
      </div>
      <div className="lg:hidden">
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </>
  );
}
