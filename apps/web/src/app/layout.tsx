import "./globals.css";
import type { Metadata } from "next";
import ClientProviders from "@/components/layout/ClientProviders";

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
    <html lang="es">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
