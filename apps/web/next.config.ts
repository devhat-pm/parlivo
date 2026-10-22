import type { NextConfig } from "next";

// PARLIVO_STATIC_EXPORT=1 builds the static export the Tauri desktop app bundles (out/).
const staticExport = process.env["PARLIVO_STATIC_EXPORT"] === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The export builds into out/ (Next 16 writes an export into distDir), so it never
  // overwrites the server build in .next.
  ...(staticExport
    ? { output: "export" as const, distDir: "out", images: { unoptimized: true } }
    : {}),
  env: { NEXT_PUBLIC_STATIC_EXPORT: staticExport ? "1" : "0" },
};

export default nextConfig;
