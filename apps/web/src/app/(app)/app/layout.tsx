import AppNavBar from "@/components/layout/AppNavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNavBar />

      <main className="container">{children}</main>
    </>
  );
}
