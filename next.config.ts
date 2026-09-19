import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @moss-dev/moss ships a native N-API addon (.node binary) — keep it out of
  // the server bundle so Next.js loads it from node_modules at runtime instead
  // of trying to webpack/turbopack it.
  serverExternalPackages: ["@moss-dev/moss", "@moss-dev/moss-core"],
};

export default nextConfig;
