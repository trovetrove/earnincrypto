// app/robots.ts
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io";
const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          `/${ADMIN_SEGMENT}/`,
          "/manage-panel/",
          "/api/",
          "/sign-in/",
          "/sign-up/",
          "/_next/",
        ],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: [`/${ADMIN_SEGMENT}/`, "/manage-panel/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: [`/${ADMIN_SEGMENT}/`, "/manage-panel/"],
      },
      {
        userAgent: "AhrefsBot",
        crawlDelay: 10,
      },
      {
        userAgent: "SemrushBot",
        crawlDelay: 10,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
