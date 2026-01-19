import "./globals.css";
import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
