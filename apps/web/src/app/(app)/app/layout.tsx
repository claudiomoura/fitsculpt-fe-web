import AppNavBar from "@/components/layout/AppNavBar";
import AppSidebar from "@/components/layout/AppSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNavBar />
      <div className="app-shell">
        <AppSidebar />
        <main className="app-content">{children}</main>
      </div>
    </>
  );
}
