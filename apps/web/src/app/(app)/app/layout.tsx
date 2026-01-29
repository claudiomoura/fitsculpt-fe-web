import AppNavBar from "@/components/layout/AppNavBar";
import AppSidebar from "@/components/layout/AppSidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNavBar />
      <div className="app-shell">
        <AppSidebar />
        <main className="app-content">{children}</main>
      </div>
      <MobileTabBar />
    </>
  );
}
