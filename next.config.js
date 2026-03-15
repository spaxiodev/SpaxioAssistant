const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
    ],
  },
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/icon.png' },
      // Locale-prefixed routes: allow /widget-preview and /widget to work without locale (default: en)
      { source: '/widget-preview', destination: '/en/widget-preview' },
      { source: '/widget', destination: '/en/widget' },
      // Fallback so /dashboard and /dashboard/* resolve if proxy redirect is ever skipped
      { source: '/dashboard', destination: '/en/dashboard' },
      { source: '/dashboard/:path*', destination: '/en/dashboard/:path*' },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [
      {
        source: '/widget.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/api/widget/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    // Suppress webpack cache serialization warning (harmless, from PackFileCacheStrategy)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /./, message: /Serializing big strings.*Buffer instead/ },
    ];
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
