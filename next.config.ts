import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /* config options here */
  // the old query-string filter, kept working for links already shared
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "topic", value: "(?<topic>[a-z-]+)" }],
        destination: "/topics/:topic",
        permanent: true,
      },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
