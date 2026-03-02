import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Allow local loopback origins in development to avoid Next.js cross-origin dev warnings.
  allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],

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
