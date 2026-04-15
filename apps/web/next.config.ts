import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@coaching/shared', '@coaching/ui'],
};

export default nextConfig;
