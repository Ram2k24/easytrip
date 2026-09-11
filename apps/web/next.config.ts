import type { NextConfig } from 'next';

/**
 * Next.js configuration (Arch §22).
 *
 * `output: 'standalone'` produces the self-contained bundle the web container runs
 * in the self-hosted compose stack (Arch §20.1) — no Vercel-specific assumptions.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // The API is a separate origin; only the server side talks to it directly.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
