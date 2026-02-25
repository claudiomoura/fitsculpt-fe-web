import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import ClientProviders from "@/components/layout/ClientProviders";
import { resolveLocale } from "@/lib/i18n";

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
  const initialTheme = cookieStore.get("fs-theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang={initialLocale} data-scroll-behavior="smooth" className={initialTheme === "dark" ? "theme-dark" : "theme-light"}>
      <body>
        <ClientProviders initialLocale={initialLocale} initialTheme={initialTheme}>{children}</ClientProviders>
      </body>
    </html>
  );
}
