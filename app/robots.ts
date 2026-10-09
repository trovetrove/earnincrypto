// app/robots.ts
//
// Two layers, because robots.txt is a request, not an instruction:
//
//   * the rules here are what a well-behaved crawler reads and obeys, so the
//     ones that do obey it stop costing anything;
//   * middleware.ts refuses the same agents outright, for the ones that don't.
//     (A `crawlDelay` is advisory and the heaviest crawlers here ignore it,
//     which is why the ones that used to have one are now disallowed instead.)
//
// The allowed set is deliberate: search engines that send readers, link
// preview bots that fetch the OG card when a page is shared, and the AI answer
// engines that cite sources. Everything else — backlink tools, scrapers and
// AI training crawlers — is disallowed.

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

// Paths no crawler needs. "/_next/" is deliberately NOT here: it serves the
// JavaScript and CSS every page is built from, and blocking it stops Google
// rendering pages the way users see them (it can then misjudge layout, mobile
// usability and any content that depends on client code).
const PRIVATE_PATHS = [`/${ADMIN_SEGMENT}/`, "/manage-panel/", "/api/", "/sign-in/", "/sign-up/"];

/**
 * Crawlers with nothing to offer this site: SEO backlink indexes, content
 * scrapers and AI training corpora. Each is also refused in middleware.ts —
 * this is the polite version, and the one that stops the request being made at
 * all. Keep the two lists in step.
 */
const DISALLOWED_AGENTS = [
  // SEO / backlink tools
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "Barkrowler",
  "SEOkicks",
  "sistrix",
  "rogerbot",
  "serpstatbot",
  "ZoomBot",
  "Cocolyzebot",
  "PetalBot",
  "Seekport",
  "VelenPublicWebCrawler",
  "SiteAuditBot",
  // Scrapers and content harvesters
  "Bytespider",
  "Diffbot",
  "omgili",
  "omgilibot",
  "ImagesiftBot",
  "Timpibot",
  "magpie-crawler",
  "TurnitinBot",
  "GrapeshotCrawler",
  "YisouSpider",
  "Sogou web spider",
  // AI training crawlers. The answer engines below are allowed on purpose:
  // they cite and link, which is worth the crawl.
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "cohere-ai",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "FacebookBot",
  "Amazonbot",
  "YouBot",
  "AI2Bot",
];

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
      { userAgent: "Claude-User", allow: "/", disallow: PRIVATE_PATHS },
      // One group per agent rather than a shared list: a crawler only reads
      // the most specific group that names it, and several of these ignore a
      // group whose User-agent line it doesn't match exactly.
      ...DISALLOWED_AGENTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
