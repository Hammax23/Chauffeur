import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development
  reactStrictMode: true,
  
  output: "standalone",
  
  // Optimize production builds
  poweredByHeader: false,

  // Compression
  compress: true,

  /**
   * Keep Node DB drivers out of the bundler graph.
   * `pg` and its deps (`pgpass`, etc.) need Node built-ins (`path`, `fs`, `stream`).
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
   */
  serverExternalPackages: [
    "pg",
    "pg-connection-string",
    "pg-pool",
    "pg-native",
    "pgpass",
    "pg-types",
    "pg-protocol",
    "postgres-array",
    "postgres-bytea",
    "postgres-date",
    "postgres-interval",
    "split2",
  ],

  // Image optimization - disabled for VPS compatibility
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "adventlimo.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
    ],
    // Serve modern formats automatically (WebP/AVIF)
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental optimizations
  experimental: {
    // optimizeCss conflicts with output: "standalone" — disabled
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|mp4|webm)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
