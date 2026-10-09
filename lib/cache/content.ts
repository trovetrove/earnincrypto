// lib/cache/content.ts
//
// The two caches that sit in front of every content read, and the tags that
// clear them.
//
// Before this, each render did its own work: two full table scans plus an
// O(n²) graph build, every time ISR regenerated a page *and* every time a bot
// probed a URL that wasn't pre-rendered. Those are the same tables and the same
// graph for every page on the site, and they only change when an editor
// publishes.
//
// So there are two layers:
//
//   1. `cachedRead` — Next's data cache (`unstable_cache`), shared by every
//      instance and every region, tagged so the publish webhook can clear it
//      (see app/api/revalidate/route.ts). This is what takes Supabase out of
//      the request path.
//
//   2. `processCache` — a per-instance memo in front of it. A data-cache hit
//      is cheap but not free: it still reads and JSON-parses the whole payload.
//      Holding the parsed array for a few minutes means a warm instance
//      serving twenty pages parses it once — and, because the memo hands back
//      the *same array instance*, the content graph built from it can be
//      memoised by identity too (see lib/seo/contentGraph.ts).
//
// Staleness is bounded by PROCESS_TTL_MS on a warm instance, and is zero after
// a publish for anything that was cold. Set CONTENT_CACHE_SECONDS to tune it.

import { unstable_cache } from "next/cache";

// ── Tags ─────────────────────────────────────────────────────────────

/** Everything content-derived. `revalidateTag(TAG_CONTENT)` clears the lot. */
export const TAG_CONTENT = "content";
/** The directory table. */
export const TAG_ENTRIES = "content:entries";
/** The blog table. */
export const TAG_POSTS = "content:posts";
/** Paid placements — a different editor on a different schedule. */
export const TAG_ADS = "content:ads";

export const ALL_CONTENT_TAGS = [TAG_CONTENT, TAG_ENTRIES, TAG_POSTS, TAG_ADS] as const;

// ── Lifetimes ────────────────────────────────────────────────────────

/**
 * How long a data-cache entry survives without a publish. A day, because the
 * publish webhook is what makes content appear now; this is only the
 * safety net for a webhook that never arrived.
 */
export const CONTENT_REVALIDATE_SECONDS = 86_400;

/** Ads rotate on their own window (start_date/end_date), so they get an hour. */
export const ADS_REVALIDATE_SECONDS = 3_600;

const PROCESS_TTL_MS =
  Math.max(0, Number(process.env.CONTENT_CACHE_SECONDS ?? 300) || 0) * 1000;

// ── Layer 1: the Next data cache ─────────────────────────────────────

/**
 * Wraps a read in the data cache. The key parts must fully determine the
 * result — these reads take no arguments beyond the site, which is in the key.
 *
 * Note on size: the data cache drops entries over 2MB (Next logs it and calls
 * through instead). The tables here are a few hundred rows, but a site with a
 * lot of long articles can cross that line, which is exactly why layer 2 is
 * not optional — it keeps the cost down even when layer 1 declines the write.
 */
export function cachedRead<T>(
  load: () => Promise<T>,
  keyParts: string[],
  tags: string[],
  revalidate: number = CONTENT_REVALIDATE_SECONDS
): () => Promise<T> {
  return unstable_cache(load, keyParts, { tags, revalidate });
}

// ── Layer 2: the per-instance memo ───────────────────────────────────

type Slot<T> = { value: Promise<T>; expires: number };

/**
 * Memoises `load` per key for PROCESS_TTL_MS. The promise is stored, not the
 * resolved value, so concurrent renders share one in-flight read; a rejection
 * evicts itself so a transient database error isn't cached.
 */
export function processCache<T>(
  load: (key: string) => Promise<T>,
  ttlMs: number = PROCESS_TTL_MS
): (key: string) => Promise<T> {
  if (ttlMs <= 0) return load;

  const slots = new Map<string, Slot<T>>();

  return (key: string): Promise<T> => {
    const now = Date.now();
    const hit = slots.get(key);
    if (hit && hit.expires > now) return hit.value;

    const value = load(key).catch((err) => {
      slots.delete(key);
      throw err;
    });
    slots.set(key, { value, expires: now + ttlMs });
    return value;
  };
}

// ── Content fingerprints ─────────────────────────────────────────────

/** FNV-1a. Stable across processes, which is what makes it usable as a key. */
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A cheap "has anything changed?" stamp for a set of rows: row count plus a
 * hash of every id and updated_at. Covers edits, inserts and deletes without
 * touching the row bodies, so computing it is O(rows) over two short strings
 * rather than over several megabytes of HTML.
 */
export function rowsDigest(rows: { id: string; updated_at: string }[]): string {
  let acc = "";
  for (const r of rows) acc += `${r.id}@${r.updated_at};`;
  return `${rows.length}-${fnv1a(acc).toString(36)}`;
}
