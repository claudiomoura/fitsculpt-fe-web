import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

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
};

export default nextConfig;
