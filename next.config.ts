import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // No rewrites needed - API routes are handled by Next.js App Router
  
  // Turbopack configuration (required for Next.js 16)
  turbopack: {},
  
  // TypeScript configuration
  typescript: {
    // Don't fail build on TypeScript errors (shouldn't happen, but safety net)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
