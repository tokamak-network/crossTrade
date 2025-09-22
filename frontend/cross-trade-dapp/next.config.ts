import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Disable ESLint during build for Docker
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript build errors for Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  }
};

export default nextConfig;
