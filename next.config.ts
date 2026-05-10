// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://clerk.sidehustletools.app https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://www.googletagmanager.com",
      "worker-src blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://clerk.sidehustletools.app https://*.supabase.co https://*.vercel-insights.com https://vitals.vercel-insights.com https://pagead2.googlesyndication.com",
      "frame-src https://challenges.cloudflare.com https://clerk.sidehustletools.app https://googleads.g.doubleclick.net",
      "frame-ancestors 'none'",
      "form-action 'self' https://clerk.sidehustletools.app",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const adminSecurityHeaders = [
  ...securityHeaders.filter((h) => h.key !== "Content-Security-Policy"),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://clerk.sidehustletools.app",
      "worker-src blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://clerk.sidehustletools.app https://*.supabase.co",
      "frame-src https://clerk.sidehustletools.app",
      "frame-ancestors 'none'",
      "form-action 'self' https://clerk.sidehustletools.app",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
  { key: "Pragma", value: "no-cache" },
  { key: "Surrogate-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: `/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "your-cloud"}/**`,
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/manage-panel/:path*",
        headers: adminSecurityHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/admin/:path*",
        destination: "/not-found",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
