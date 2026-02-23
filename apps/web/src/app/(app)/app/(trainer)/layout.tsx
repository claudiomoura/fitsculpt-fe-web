import AppShellLayout from "@/components/layout/AppShellLayout";

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLayout shell="trainer">{children}</AppShellLayout>;
}
