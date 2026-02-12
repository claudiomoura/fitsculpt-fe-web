import AppNavBar from "@/components/layout/AppNavBar";
import AppSidebar from "@/components/layout/AppSidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <AppNavBar />
      <div className="app-shell">
        <AppSidebar />
        <main className="app-content page-with-tabbar-safe-area">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
