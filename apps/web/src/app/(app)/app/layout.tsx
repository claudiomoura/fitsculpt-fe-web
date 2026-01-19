import AppNavBar from "@/components/layout/AppNavBar";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppNavBar />

        <main className="container">{children}</main>
      </LanguageProvider>
    </ThemeProvider>
  );
}
