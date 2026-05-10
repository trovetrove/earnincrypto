import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

const isAdminRoute = createRouteMatcher([`/${ADMIN_SEGMENT}(.*)`]);
const isInternalAdminRoute = createRouteMatcher(["/manage-panel(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
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

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
