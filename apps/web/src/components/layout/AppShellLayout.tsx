import AppNavBar from "@/components/layout/AppNavBar";
import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import AppPrimaryNavigation from "@/components/layout/AppPrimaryNavigation";

type AppShellLayoutProps = {
  children: React.ReactNode;
  shell: "app" | "admin" | "trainer";
};

export default function AppShellLayout({ children, shell }: AppShellLayoutProps) {
  const useV0Navigation = shell === "app";

  return (
    <div className="app-frame" data-shell={shell}>
      <AppNavBar />
      <div className="app-shell">
        {useV0Navigation ? <AppPrimaryNavigation /> : <Sidebar />}
        <main className="app-content page-with-tabbar-safe-area">{children}</main>
      </div>
      {!useV0Navigation ? <MobileTabBar /> : null}
    </div>
  );
}
