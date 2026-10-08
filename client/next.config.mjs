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
    root: path.resolve(__dirname, '..')
  },
  async rewrites() {
    const backendPort = process.env.BACKEND_PORT || (process.env.PORT && process.env.PORT !== '3000' ? process.env.PORT : '5000');
    const backendUrl = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`;
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      }
    ];
  }
};

export default nextConfig;
