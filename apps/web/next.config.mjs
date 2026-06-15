/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@guild/shared'],
  async headers() {
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
        source: '/dashboard/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/login/:path*',
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
