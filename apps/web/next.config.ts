import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The Impressum moved to /legal-notice; keep old links working.
    return [{ source: "/impressum", destination: "/legal-notice", permanent: true }];
  },
};

export default nextConfig;
