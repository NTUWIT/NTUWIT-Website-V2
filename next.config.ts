import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The console saves a problem, tests included, through a server action.
      // The default 1 MB cannot hold a few LeetCode-sized inputs; Vercel's own
      // request ceiling is 4.5 MB, so stay under it.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
