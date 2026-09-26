// app/robots.ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

// Paths no crawler needs. "/_next/" is deliberately NOT here: it serves the
// JavaScript and CSS every page is built from, and blocking it stops Google
// rendering pages the way users see them (it can then misjudge layout, mobile
// usability and any content that depends on client code).
const PRIVATE_PATHS = [`/${ADMIN_SEGMENT}/`, "/manage-panel/", "/api/", "/sign-in/", "/sign-up/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // AI answer engines follow their own group, not "*", so they need the
      // same private paths repeated.
      { userAgent: "PerplexityBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "ChatGPT-User", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: PRIVATE_PATHS },
      // Slow down aggressive SEO scrapers
      { userAgent: "AhrefsBot", crawlDelay: 10 },
      { userAgent: "SemrushBot", crawlDelay: 10 },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
