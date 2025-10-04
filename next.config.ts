import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "**/*": ["./data/**"], // ensure data/ is available to server code
  },
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
