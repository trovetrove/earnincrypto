// middleware.ts
//
// Runs on every request that can reach a page, so everything here is on the
// hot path and ordered by what it costs.
//
//   1. Drop the traffic that is never going to be a reader: scraper and
//      SEO-tool user agents, and the WordPress/PHP exploit probes that make up
//      most of what hits a small site. A 403 or 404 from here ends the request
//      before Next renders anything, which is the difference between a bot
//      sweep costing nothing and it costing a page render per URL.
//   2. The redirects and robots headers the site's URL design needs.
//   3. Clerk — and only for the admin segment. clerkMiddleware() used to wrap
//      every request on the site, verifying a session JWT for readers who have
//      never had one. The root ClerkProvider is static (no `dynamic` prop), so
//      it doesn't need the middleware to have run on public routes.
//
// The matcher at the bottom keeps this out of static assets, _next, the
// generated icons and robots/sitemap entirely.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { CRYPTO_CLUSTERS } from "@/lib/seo/clusters";

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

const isAdminRoute = createRouteMatcher([`/${ADMIN_SEGMENT}(.*)`]);
const isInternalAdminRoute = createRouteMatcher(["/manage-panel(.*)"]);
/** The only paths that still need a Clerk session resolved. */
const isClerkRoute = createRouteMatcher([
  `/${ADMIN_SEGMENT}(.*)`,
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const CLUSTER_IDS = new Set(CRYPTO_CLUSTERS.map((c) => c.id));

// ── 1. Traffic that isn't worth a render ─────────────────────────────

/**
 * User agents refused outright.
 *
 * The test is a lowercase substring match, so each token has to be specific
 * enough not to catch a browser or a search engine. What's here is SEO
 * backlink crawlers (they index nothing and crawl hardest), content scrapers,
 * AI *training* crawlers, and bare HTTP clients — a real reader never arrives
 * as "python-requests".
 *
 * Deliberately NOT here, and must stay out:
 *   * every Googlebot, Bingbot, Applebot, DuckDuckBot and Yandex variant —
 *     these are the indexing this site exists for;
 *   * link preview bots (Twitterbot, facebookexternalhit, LinkedInBot,
 *     Slackbot, Discordbot, TelegramBot, WhatsApp) — they fetch the OG card
 *     when someone shares a page;
 *   * AI *answer* engines that cite and send traffic: PerplexityBot,
 *     ChatGPT-User, OAI-SearchBot, Claude-User. Note that the training
 *     crawlers from the same vendors (GPTBot, ClaudeBot, Google-Extended) are
 *     blocked — and that "claudebot" would also match "claude-user", so that
 *     pair is handled by the allowlist check below.
 */
const BLOCKED_AGENTS = [
  // SEO / backlink tools
  "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "blexbot", "dataforseobot",
  "barkrowler", "seokicks", "sistrix", "rogerbot", "majestic12", "serpstatbot",
  "linkdexbot", "spbot", "zoominfobot", "cocolyzebot", "seznambot", "siteauditbot",
  "screaming frog", "sitecheckerbotcrawler", "awariosmartbot", "awariorssbot",
  "semanticscholarbot", "petalbot", "aspiegelbot", "seekport", "velenpubliccrawler",
  // Scrapers and content harvesters
  "bytespider", "bytedance", "diffbot", "omgili", "omgilibot", "imagesiftbot",
  "timpibot", "magpie-crawler", "trendictionbot", "webzio", "dataprovider",
  "turnitinbot", "grapeshotcrawler", "proximic", "nutch", "heritrix",
  "yisouspider", "360spider", "sogou", "mediatoolkitbot", "newslookupbot",
  // AI training crawlers (the answer engines are allowed, see above)
  "gptbot", "ccbot", "claudebot", "anthropic-ai", "cohere-ai", "meta-externalagent",
  "applebot-extended", "amazonbot", "youbot", "ai2bot", "iaskspider",
  // Bare HTTP clients and scripted fetchers
  "python-requests", "python-urllib", "aiohttp", "httpx", "scrapy", "go-http-client",
  "libwww-perl", "java/", "okhttp", "jakarta", "wget", "winhttp", "zgrab", "masscan",
  "nmap", "nikto", "sqlmap", "wpscan", "dirbuster", "gobuster", "feroxbuster",
  "censysinspect", "internet-measurement", "paloaltonetworks", "expanse",
];

/**
 * Agents that must pass even though a token above is a substring of them.
 * Checked first, so the pair ("claudebot", "claude-user") stays unambiguous.
 */
const AGENT_ALLOWLIST = ["claude-user", "chatgpt-user", "oai-searchbot", "perplexitybot"];

function isBlockedAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  if (!ua) return false;
  if (AGENT_ALLOWLIST.some((a) => ua.includes(a))) return false;
  return BLOCKED_AGENTS.some((a) => ua.includes(a));
}

/**
 * Paths this site has never served, probed in bursts by vulnerability
 * scanners. Answering from here costs nothing; letting them through costs a
 * not-found render each, and they arrive hundreds at a time.
 */
const PROBE_PATTERNS = [
  /^\/wp-(admin|login|content|includes|json)/i,
  /^\/(xmlrpc|wlwmanifest)\.php/i,
  /\.(php|phtml|asp|aspx|jsp|cgi|pl|sh|bak|old|sql|env|ini|conf|yml|yaml)$/i,
  /^\/\.(env|git|svn|aws|ssh|vscode|idea|DS_Store)/i,
  /^\/(phpmyadmin|pma|myadmin|adminer|mysql|cpanel|webmail|owa|autodiscover)/i,
  /^\/(vendor|node_modules|storage|backup|backups|dump|dumps|config)\//i,
  /^\/(telerik|struts|jenkins|solr|actuator|druid|hudson)/i,
  /\/(credentials|id_rsa|\.htpasswd|web\.config)$/i,
];

function isProbePath(pathname: string): boolean {
  return PROBE_PATTERNS.some((re) => re.test(pathname));
}

/**
 * A refusal with no body and no cache. 403 for an agent (it's the agent that's
 * refused, not the URL) and 404 for a probe path, which is the truth and tells
 * a scanner nothing. Neither is indexable, so both carry noindex.
 */
function refuse(status: 403 | 404): NextResponse {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// ── 2. URL design ────────────────────────────────────────────────────

/**
 * Topic hubs moved from /blog?cluster=<id> (a query-string view of the blog) to
 * /topics/<id> (a real page joining articles and listings). The old URLs were
 * in the sitemap, so they get a permanent 301 to their new home — with the
 * query string dropped, which a next.config redirect can't do. A cluster id
 * that no longer exists goes to the blog rather than 404ing.
 */
function legacyHubRedirect(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname !== "/blog") return null;
  const cluster = req.nextUrl.searchParams.get("cluster");
  if (cluster === null) return null;
  const url = req.nextUrl.clone();
  url.search = "";
  url.pathname = CLUSTER_IDS.has(cluster) ? `/topics/${cluster}` : "/blog";
  return NextResponse.redirect(url, 301);
}

/**
 * Filtered views of list pages (/directory?search=…, /directory?category=…)
 * are the same list re-sorted in the browser. The pages are static, so they
 * can't vary their robots meta by query string; the header can. The canonical
 * already points at the clean URL — this keeps the variants out of the index.
 */
const FILTER_PARAMS = ["search", "q", "category", "featured", "risk", "price", "sort", "chain", "tag"];

function isFilteredListView(req: NextRequest): boolean {
  const { pathname, searchParams } = req.nextUrl;
  // Checked before the pathname tests because most requests have no query
  // string at all, and then there is nothing to decide.
  if (!FILTER_PARAMS.some((p) => searchParams.has(p))) return false;
  return (
    pathname === "/directory" ||
    pathname === "/compare" ||
    pathname.startsWith("/topics") ||
    /^\/[a-z0-9-]+\/?$/.test(pathname)
  );
}

// ── 3. Clerk, for the admin segment only ─────────────────────────────

const withClerk = clerkMiddleware(async (auth, req: NextRequest) => {
  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    const role = (sessionClaims as { metadata?: { role?: string } } | null)?.metadata?.role;
    if (role !== "admin") {
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }

    const url = req.nextUrl.clone();
    url.pathname = req.nextUrl.pathname.replace(`/${ADMIN_SEGMENT}`, "/manage-panel");
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isProbePath(req.nextUrl.pathname)) return refuse(404);
  if (isBlockedAgent(req.headers.get("user-agent") ?? "")) return refuse(403);

  if (isInternalAdminRoute(req)) {
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }

  const legacy = legacyHubRedirect(req);
  if (legacy) return legacy;

  if (isClerkRoute(req)) return withClerk(req, event);

  if (isFilteredListView(req)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, follow");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  // Pages only. Static assets, the Next build output, the generated icons and
  // OG cards, robots.txt, sitemap.xml and /api never need any of the above, and
  // every path excluded here is a middleware invocation that doesn't happen.
  matcher: [
    "/((?!_next/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|icon$|apple-icon$|opengraph-image$|logo\\.png|stats/|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|map|txt|xml|json|woff2?|ttf|otf|eot|mp4|webm|pdf)$).*)",
  ],
};
