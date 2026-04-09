import type { NextConfig } from "next";
import "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: false,

  // Allow local loopback origins in development to avoid Next.js cross-origin/HMR warnings in E2E.
  allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000", "localhost", "127.0.0.1"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },

  async redirects() {
    return [
      { source: "/app/today", destination: "/app/hoy", permanent: true },
      { source: "/app/training", destination: "/app/entrenamiento", permanent: true },
      { source: "/app/nutrition", destination: "/app/nutricion", permanent: true },
      { source: "/app/nutrition/edit", destination: "/app/nutricion/editar", permanent: true },
      { source: "/app/progress", destination: "/app/seguimiento", permanent: true },
      {
        source: "/app/biblioteca/entrenamientos/:path*",
        destination: "/app/biblioteca/planes-entrenamiento/:path*",
        permanent: true,
      },
      {
        source: "/app/dietas/:path*",
        destination: "/app/biblioteca/planes-nutricion/:path*",
        permanent: true,
      },
      {
        source: "/app/entrenamientos/:path*",
        destination: "/app/entrenamiento/:path*",
        permanent: true,
      },
      {
        source: "/app/workouts/:path*",
        destination: "/app/entrenamiento/:path*",
        permanent: true,
      },
      {
        source: "/app/treinador/:path*",
        destination: "/app/trainer/:path*",
        permanent: false,
      },
      { source: "/app/treinador", destination: "/app/trainer", permanent: false },
    ];
  },
};

export default nextConfig;
