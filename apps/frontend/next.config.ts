import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://meet.jit.si https://8x8.vc",
              "style-src 'self' 'unsafe-inline'",
              "frame-src https://meet.jit.si https://8x8.vc",
              "connect-src 'self' http://localhost:3001 https://eminor-api-production.up.railway.app https://*.r2.cloudflarestorage.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https://meet.jit.si",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
