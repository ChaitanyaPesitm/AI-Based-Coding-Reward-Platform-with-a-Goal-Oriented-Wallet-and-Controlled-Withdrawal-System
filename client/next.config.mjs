import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Dev cache lives in .next on OneDrive and keeps getting corrupted
    // (Turbopack panics). Disable the filesystem cache for `next dev`.
    turbopackFileSystemCacheForDev: false
  },
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
