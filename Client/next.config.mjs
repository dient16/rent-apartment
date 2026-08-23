import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: false,
   // A stray lockfile at the repo root confuses tracing — pin the root to the client dir
   outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
   typescript: {
      ignoreBuildErrors: false,
   },
   images: {
      // Image imports resolve to URL strings (Vite parity) so <img src={logo}> keeps working
      disableStaticImages: true,
   },
   // Next 16 bundles with Turbopack, which already emits static assets as URLs —
   // the previous custom webpack `asset/resource` rule is no longer needed.
   turbopack: {},
};

export default nextConfig;
