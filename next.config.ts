import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is only for custom Docker deployments and conflicts with Vercel tracing
  ...(process.env.STANDALONE === "true" ? { output: "standalone" } : {}),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
