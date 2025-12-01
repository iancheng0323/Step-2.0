import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable source maps in production for smaller bundle
  productionBrowserSourceMaps: false,
  
  // Compress output
  compress: true,
  
  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
