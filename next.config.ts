import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* allow the sandbox preview proxy to load dev assets */
  allowedDevOrigins: ["https://*.space-z.ai"],
  /* hide the dev-tools "N" bubble so the editor UI stays clean */
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
