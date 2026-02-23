import AppShellLayout from "@/components/layout/AppShellLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLayout shell="admin">{children}</AppShellLayout>;
}
