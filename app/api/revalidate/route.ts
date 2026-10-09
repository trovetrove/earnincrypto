// app/api/revalidate/route.ts
//
// The hook that makes long ISR windows safe.
//
// Every content page on this site now revalidates once a day instead of once
// an hour, and the Supabase reads behind them are cached for the same window
// (lib/cache/content.ts). That is only acceptable because publishing clears
// them: the sidehustletools manage panel calls this route after it writes, and
// the next request rebuilds from fresh rows.
//
// Without it the site would still be correct — the day-long window is the
// backstop — but an edit could take a day to appear.
//
//   POST /api/revalidate
//   x-revalidate-secret: <CONTENT_REVALIDATE_SECRET>
//   { "scope": "all" | "entries" | "posts" | "ads", "paths": ["/blog/foo"] }
//
// Both fields are optional; the default clears everything content-derived.
// GET is supported with ?secret= for a quick manual flush from a browser.
//
// robots.txt disallows /api/, and an unauthenticated call gets a bare 401 with
// no hint about what it got wrong.

import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ALL_CONTENT_TAGS,
  TAG_ADS,
  TAG_CONTENT,
  TAG_ENTRIES,
  TAG_POSTS,
} from "@/lib/cache/content";

export const runtime = "nodejs";
// Never cached, never pre-rendered: it exists to have side effects.
export const dynamic = "force-dynamic";

const SCOPES: Record<string, readonly string[]> = {
  all: ALL_CONTENT_TAGS,
  entries: [TAG_CONTENT, TAG_ENTRIES],
  posts: [TAG_CONTENT, TAG_POSTS],
  ads: [TAG_ADS],
};

/** Constant-time compare, so a wrong secret can't be narrowed down by timing. */
function secretMatches(given: string | null): boolean {
  const expected = process.env.CONTENT_REVALIDATE_SECRET;
  if (!expected || !given) return false;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function presentedSecret(req: NextRequest): string | null {
  const header = req.headers.get("x-revalidate-secret");
  if (header) return header;
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7);
  return req.nextUrl.searchParams.get("secret");
}

/** At most this many paths per call — a path list is not a way to buy renders. */
const MAX_PATHS = 25;

function requestedPaths(body: unknown, req: NextRequest): string[] {
  const fromBody =
    body && typeof body === "object" && Array.isArray((body as { paths?: unknown }).paths)
      ? ((body as { paths: unknown[] }).paths as unknown[])
      : [];
  const fromQuery = req.nextUrl.searchParams.getAll("path");

  return [...fromBody, ...fromQuery]
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim())
    // Site-relative only. A caller must not be able to name another route's
    // cache, and "//host" or "/../" are not paths on this site.
    .filter((p) => /^\/[\w\-./]*$/.test(p) && !p.startsWith("//") && !p.includes(".."))
    .slice(0, MAX_PATHS);
}

async function handle(req: NextRequest) {
  if (!secretMatches(presentedSecret(req))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown = null;
  if (req.method === "POST") {
    body = await req.json().catch(() => null);
  }

  const requested =
    (body && typeof body === "object" ? (body as { scope?: unknown }).scope : null) ??
    req.nextUrl.searchParams.get("scope") ??
    "all";
  const scope = typeof requested === "string" && requested in SCOPES ? requested : "all";

  for (const tag of SCOPES[scope]) revalidateTag(tag);

  const paths = requestedPaths(body, req);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json(
    { ok: true, scope, tags: SCOPES[scope], paths, at: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
