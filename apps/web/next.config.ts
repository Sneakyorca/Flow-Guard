import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(process.cwd(), "../..");

// One .env for the whole repo: also read the root .env (the README's setup puts keys there).
// Values already set (apps/web/.env*, Vercel env vars) win; a missing file is fine.
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {}

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source.
  transpilePackages: ["@flowguard/shared"],
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
