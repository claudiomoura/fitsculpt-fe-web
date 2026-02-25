import AppShellLayout from "@/components/layout/AppShellLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLayout shell="app">{children}</AppShellLayout>;
}
