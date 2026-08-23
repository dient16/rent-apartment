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
   // Next 16 bundles with Turbopack; static image imports are handled natively.
   turbopack: {},
};

export default nextConfig;
