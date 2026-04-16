import type { NextConfig } from 'next';

// bust turbo cache
const nextConfig: NextConfig = {
  transpilePackages: ['@coaching/shared', '@coaching/ui'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
