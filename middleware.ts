import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CRYPTO_CLUSTERS } from "@/lib/seo/clusters";

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

const isAdminRoute = createRouteMatcher([`/${ADMIN_SEGMENT}(.*)`]);
const isInternalAdminRoute = createRouteMatcher(["/manage-panel(.*)"]);

const CLUSTER_IDS = new Set(CRYPTO_CLUSTERS.map((c) => c.id));

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
  const isList = pathname === "/directory" || pathname === "/compare" || pathname.startsWith("/topics") ||
    /^\/[a-z0-9-]+\/?$/.test(pathname);
  return isList && FILTER_PARAMS.some((p) => searchParams.has(p));
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const legacy = legacyHubRedirect(req);
  if (legacy) return legacy;

  const isInternalAdmin = isInternalAdminRoute(req);
  if (isInternalAdmin) {
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }

  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();

    console.log("[admin] userId:", userId);
    console.log("[admin] claims:", JSON.stringify(sessionClaims));

    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    const role = (sessionClaims as any)?.metadata?.role;
    if (role !== "admin") {
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }

    const internalPath = req.nextUrl.pathname.replace(
      `/${ADMIN_SEGMENT}`,
      "/manage-panel"
    );
    const url = req.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.rewrite(url);
  }

  if (isFilteredListView(req)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, follow");
    return res;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
