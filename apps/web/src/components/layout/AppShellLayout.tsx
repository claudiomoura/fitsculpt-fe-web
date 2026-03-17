"use client";

import { usePathname } from "next/navigation";
import AppNavBar from "@/components/layout/AppNavBar";
import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import { isFocusRoute } from "@/components/layout/focusRoutes";

type AppShellLayoutProps = {
  children: React.ReactNode;
  shell: "app" | "admin" | "trainer";
};

export default function AppShellLayout({ children, shell }: AppShellLayoutProps) {
  const pathname = usePathname();
  const isFocusSessionRoute = isFocusRoute(pathname);

  if (isFocusSessionRoute) {
    return (
      <div className="focus-app-frame" data-shell={shell} data-focus-shell="true">
        <main className="focus-app-content">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-frame" data-shell={shell}>
      <AppNavBar />
      <div className="app-shell">
        <Sidebar />
        <main className="app-content page-with-tabbar-safe-area">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
