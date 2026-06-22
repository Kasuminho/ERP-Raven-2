/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@guild/shared'],
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://discord.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com https://drive.google.com https://*.googleusercontent.com https://cdn.discordapp.com; font-src 'self' data:; connect-src 'self' https://app.guild-g3x.com.br https://api.guild-g3x.com.br ws: wss:; object-src 'none'; upgrade-insecure-requests",
      },
    ];
    const noStoreHeaders = [
      {
        key: 'Cache-Control',
        value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
      {
        key: 'Pragma',
        value: 'no-cache',
      },
      {
        key: 'Expires',
        value: '0',
      },
      {
        key: 'X-Guild-Web-Cache',
        value: 'no-store',
      },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/dashboard/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/login/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/privacy',
        headers: noStoreHeaders,
      },
      {
        source: '/testo/sembra/tesma/privacy-policy',
        headers: noStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
