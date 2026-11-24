import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source.
  transpilePackages: ["@flowguard/shared"],
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
