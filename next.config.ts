import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack does not infer it from
  // an unrelated parent lockfile (fixes the "multiple lockfiles" warning).
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
