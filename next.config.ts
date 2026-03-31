import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  
  // TypeScript ignore is still generally supported, 
  // but we remove 'eslint' as it causes an 'Unrecognized key' error.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
