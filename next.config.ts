import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // No rewrites needed - API routes are handled by Next.js App Router
  
  // Turbopack configuration (required for Next.js 16)
  turbopack: {},
};

export default nextConfig;
