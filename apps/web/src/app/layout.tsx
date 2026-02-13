import "./globals.css";
import type { Metadata, Viewport } from "next";
import ClientProviders from "@/components/layout/ClientProviders";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "FitSculpt",
  description: "Landing + Inicio de sesión",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="theme-dark">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
