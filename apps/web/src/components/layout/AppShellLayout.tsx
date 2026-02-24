import AppNavBar from "@/components/layout/AppNavBar";
import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";

type AppShellLayoutProps = {
  children: React.ReactNode;
  shell: "app" | "admin" | "trainer";
};

export default function AppShellLayout({ children, shell }: AppShellLayoutProps) {
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
