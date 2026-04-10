import "./globals.css";
import "./globals.app.css";
import "./globals.marketing.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import ClientProviders from "@/components/layout/ClientProviders";
import { resolveLocale } from "@/lib/i18n";
import AppInit from "@/components/app-init/AppInit";
import WebVitals from "@/components/analytics/WebVitals";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "FitSculpt",
  description: "Landing + Inicio de sesión",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLocale = resolveLocale(cookieStore.get("fs-locale")?.value);
  const rawTheme = cookieStore.get("fs-theme")?.value;
  const initialTheme = rawTheme === "light" || rawTheme === "dark" || rawTheme === "system" ? rawTheme : "dark";
  const initialThemeClass = initialTheme === "light" ? "theme-light" : "theme-dark";

  return (
    <html lang={initialLocale} data-scroll-behavior="smooth" className={initialThemeClass}>
      <body>
        <WebVitals />
        <ClientProviders initialLocale={initialLocale} initialTheme={initialTheme}>
          <AppInit>{children}</AppInit>
        </ClientProviders>
      </body>
    </html>
  );
}
