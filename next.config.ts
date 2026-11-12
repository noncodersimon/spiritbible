import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "**/*": ["./data/bible.sqlite"], // only the generated server database; source archives stay out of deployments
  },
  outputFileTracingExcludes: {
    "**/*": ["./data/sources/**"], // the legacy debug route scans data/; never package the source archives
  },
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
