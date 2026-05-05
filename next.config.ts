import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  onDemandEntries: {
    maxInactiveAge: 10 * 1000,
    pagesBufferLength: 1,
  },
  experimental: {
    cpus: 2,
    memoryBasedWorkersCount: true,
  },
};

export default nextConfig;
