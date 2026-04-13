import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __appDir = path.dirname(__filename);

const nextConfig: NextConfig = {
  turbopack: {
    root: __appDir,
  },
};

export default nextConfig;
