import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // Dev only: nginx proxies /api/market/* to the market API in production,
  // but `next dev` serves nothing there. This rewrite makes the live-data
  // sections testable locally. It is never part of the exported build.
  ...(isDev
    ? {
        async rewrites() {
          return [
            { source: '/api/market/:path*', destination: 'http://127.0.0.1:4100/api/market/:path*' },
          ];
        },
      }
    : {}),
};

export default nextConfig;
