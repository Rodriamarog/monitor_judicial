import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Configure the maximum size for client request bodies
  serverExternalPackages: ['busboy'],
};

export default nextConfig;
